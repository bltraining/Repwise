// Cloudflare static preview: deliberately never requests runtime config or Supabase.
(function () {
  window.REPW_SUPABASE_CONFIG = Object.freeze({ assistantReadOnly: true })

  var banner = document.createElement('aside')
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-label', 'Mode aperçu Repwise')
  banner.textContent = 'MODE APERÇU — données fictives. Connexion, synchronisation, paiements, IA et messagerie désactivés.'
  banner.style.cssText = 'position:sticky;top:0;z-index:10000;padding:10px 14px;background:#70421f;color:#fff;text-align:center;font:600 13px/1.4 system-ui,sans-serif'
  document.body.prepend(banner)

  var app = document.createElement('script')
  app.src = '/app.js'
  app.onload = function () {
    var preview = document.createElement('script')
    preview.src = '/preview-mode.js'
    document.body.appendChild(preview)
  }
  app.onerror = function () {
    banner.textContent = 'MODE APERÇU — Repwise n’a pas pu charger ses fichiers. Aucun service externe n’a été contacté.'
  }
  document.body.appendChild(app)
})()
