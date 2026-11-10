fetch('/.netlify/functions/repwise-runtime-config', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error('runtime configuration unavailable')
    return response.json()
  })
  .then((config) => {
    if (!config?.url || !config?.key) throw new Error('runtime configuration invalid')
    window.REPW_SUPABASE_CONFIG = config
    const app = document.createElement('script')
    app.src = '/app.js'
    document.body.appendChild(app)
  })
  .catch(() => {
    const message = document.getElementById('runtimeConfigFailure')
    if (message) message.hidden = false
  })
