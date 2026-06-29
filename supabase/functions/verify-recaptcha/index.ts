// Supabase Edge Function — verify-recaptcha
//
// Verifies a reCAPTCHA v3 token with Google using the SECRET key, which must
// never live in the frontend, then enforces a server-side per-IP rate limit
// (the localStorage limit on the client is trivially bypassed by a bot).
//
// Deploy & configure:
//
//   supabase functions deploy verify-recaptcha
//   supabase secrets set RECAPTCHA_SECRET_KEY=<your-secret-from-recaptcha-admin>
//
// Tunable knobs (all optional — sensible defaults below). Change without
// redeploying by running `supabase secrets set NAME=value`:
//
//   RECAPTCHA_SCORE_THRESHOLD  min v3 score to accept            (default 0.5)
//   ROUTE_RATE_LIMIT           max route requests per IP/window  (default 30)
//   ROUTE_RATE_WINDOW_SECS     sliding window length in seconds  (default 3600)
//
// Rate limiting needs the route_requests table + check_and_record_route()
// function — run supabase/rate_limit.sql first. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected into Edge Functions automatically.
//
// The frontend calls this via supabase.functions.invoke('verify-recaptcha', ...)
// and only proceeds when { success: true } is returned.

const SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY')

// Minimum v3 score to accept. Google returns 0.0 (bot) .. 1.0 (human).
const SCORE_THRESHOLD = Number(Deno.env.get('RECAPTCHA_SCORE_THRESHOLD') ?? '0.5')

// Server-side rate limit (per IP). Defaults give real users plenty of headroom
// while capping automated abuse of the paid Directions API.
const RATE_LIMIT = Number(Deno.env.get('ROUTE_RATE_LIMIT') ?? '30')
const RATE_WINDOW_SECS = Number(Deno.env.get('ROUTE_RATE_WINDOW_SECS') ?? '3600')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// CORS — allow the browser to call this function. Tighten the origin to your
// own domain in production if you prefer.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Best-effort client IP. Behind Supabase/Cloudflare, x-forwarded-for is set by
// the edge and cannot be spoofed by the client (unlike the ipify lookup the
// frontend does for analytics).
function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// Calls the atomic check-and-record RPC. Returns the rate-limit verdict, or
// null if the limiter itself is unreachable/misconfigured (fail-open: don't
// lock real users out over an infra hiccup — same policy as the client).
async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean; retry_after_secs: number } | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL / SERVICE_ROLE_KEY missing — skipping rate limit')
    return null
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_and_record_route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_ip: ip,
        p_limit: RATE_LIMIT,
        p_window_secs: RATE_WINDOW_SECS,
      }),
    })
    if (!res.ok) {
      console.error('rate limit RPC failed:', res.status, await res.text())
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('rate limit RPC error:', err)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'method_not_allowed' }, 405)
  }

  if (!SECRET_KEY) {
    console.error('RECAPTCHA_SECRET_KEY is not set')
    return json({ success: false, error: 'server_not_configured' }, 500)
  }

  let token: string | undefined
  let expectedAction: string | undefined
  try {
    const body = await req.json()
    token = body?.token
    expectedAction = body?.action
  } catch {
    return json({ success: false, error: 'invalid_body' }, 400)
  }

  if (!token) {
    return json({ success: false, error: 'missing_token' }, 400)
  }

  // Verify with Google.
  let outcome: {
    success: boolean
    score?: number
    action?: string
    'error-codes'?: string[]
  }
  try {
    const params = new URLSearchParams({ secret: SECRET_KEY, response: token })
    const res = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      },
    )
    outcome = await res.json()
  } catch (err) {
    console.error('siteverify request failed:', err)
    return json({ success: false, error: 'verify_request_failed' }, 502)
  }

  // Google itself rejected the token (expired, wrong secret, duplicate, …).
  if (!outcome.success) {
    return json({
      success: false,
      error: 'token_invalid',
      'error-codes': outcome['error-codes'] ?? [],
    })
  }

  // Optional: ensure the token was minted for the action we expect.
  if (expectedAction && outcome.action && outcome.action !== expectedAction) {
    return json({
      success: false,
      error: 'action_mismatch',
      action: outcome.action,
    })
  }

  const score = outcome.score ?? 0
  if (score < SCORE_THRESHOLD) {
    return json({ success: false, error: 'low_score', score })
  }

  // reCAPTCHA passed — now enforce the per-IP rate limit. A genuine human who
  // scripts the endpoint still can't exceed RATE_LIMIT requests per window.
  const limit = await checkRateLimit(clientIp(req))
  if (limit && !limit.allowed) {
    return json(
      {
        success: false,
        error: 'rate_limited',
        retry_after_secs: limit.retry_after_secs,
      },
      429,
    )
  }

  return json({ success: true, score, action: outcome.action })
})
