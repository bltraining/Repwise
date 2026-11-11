// Load the public Repwise preview and its same-origin, server-verified sign-in flow.
(function () {
  var banner = document.createElement('aside')
  banner.setAttribute('role', 'status')
  banner.setAttribute('aria-label', 'Mode aperçu Repwise')
  banner.textContent = 'MODE APERÇU — données Repwise fictives. Les services métier restent inactifs.'
  banner.style.cssText = 'position:sticky;top:0;z-index:10000;padding:10px 14px;background:#70421f;color:#fff;text-align:center;font:600 13px/1.4 system-ui,sans-serif'
  document.body.prepend(banner)

  var app = document.createElement('script')
  app.src = '/app.js'
  app.onload = function () {
    var preview = document.createElement('script')
    preview.src = '/preview-mode.js'
    preview.onload = function () {
      var access = document.createElement('script')
      access.src = '/founder-access.js'
      document.body.appendChild(access)
    }
    document.body.appendChild(preview)
  }
  app.onerror = function () {
    banner.textContent = 'MODE APERÇU — Repwise n’a pas pu charger ses fichiers. Aucun service externe n’a été contacté.'
  }
  document.body.appendChild(app)
})()
