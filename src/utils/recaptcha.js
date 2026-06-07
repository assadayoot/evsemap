// Set VITE_RECAPTCHA_SITE_KEY in .env to enable reCAPTCHA v3.
// Without it the check is skipped gracefully (no errors, no blocking).
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
