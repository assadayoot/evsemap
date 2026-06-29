// Set VITE_RECAPTCHA_SITE_KEY in .env to enable reCAPTCHA v3.
// Without it the check is skipped gracefully (no errors, no blocking).
import { supabase } from '../lib/supabase'

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

export const recaptchaEnabled = !!SITE_KEY

let scriptLoaded = false

function loadScript() {
  if (!SITE_KEY) return Promise.resolve()
  if (scriptLoaded || window.grecaptcha) { scriptLoaded = true; return Promise.resolve() }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    s.onload = () => { scriptLoaded = true; resolve() }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// Returns a reCAPTCHA token or null if not configured / failed.
// Never throws — callers should proceed on null (graceful degradation).
export async function getRecaptchaToken(action = 'find_route') {
  if (!SITE_KEY) return null
  try {
    await loadScript()
    return await new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(SITE_KEY, { action })
          resolve(token)
        } catch {
          resolve(null)
        }
      })
    })
  } catch {
    return null
  }
}

// Verifies a token via the Supabase Edge Function (which holds the SECRET key,
// calls Google's siteverify, and enforces the per-IP rate limit). This is the
// half that actually protects the site — generating a token alone does nothing.
//
// Returns { ok, error?, retryAfterSecs? }.
//   ok:true                              → proceed
//   ok:false, error:'rate_limited'       → over the server limit (block, show wait)
//   ok:false, error:<other>              → bot/invalid signal (block)
//
// Fail policy: block on a clear signal (bad token, rate limit), but allow
// through when the check can't run at all (function unreachable / not deployed)
// so real users aren't locked out by an outage.
export async function verifyRecaptcha(token, action = 'find_route') {
  if (!SITE_KEY) return { ok: true } // reCAPTCHA disabled — nothing to verify
  if (!supabase) return { ok: true } // no backend configured
  if (!token) return { ok: false, error: 'missing_token' }

  try {
    const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
      body: { token, action },
    })

    if (error) {
      // A non-2xx response (e.g. 429 rate_limited) surfaces here with the body
      // tucked inside error.context. Read it so we don't fail-open on a limit.
      let body = null
      try { body = await error.context?.json?.() } catch { /* not JSON */ }
      if (body?.error === 'rate_limited') {
        return { ok: false, error: 'rate_limited', retryAfterSecs: body.retry_after_secs ?? 0 }
      }
      // Genuinely unreachable / 5xx — don't block legitimate users.
      console.warn('reCAPTCHA verify unavailable:', error.message)
      return { ok: true }
    }

    if (data?.success === true) return { ok: true }
    return { ok: false, error: data?.error ?? 'verify_failed' }
  } catch (err) {
    console.warn('reCAPTCHA verify failed:', err)
    return { ok: true }
  }
}
