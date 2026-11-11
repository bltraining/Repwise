// Keep the public Repwise preview disconnected from business integrations.
(function () {
  var banner = document.querySelector('[aria-label="Mode aperçu Repwise"]')
  if (banner) banner.textContent = 'MODE APERÇU — données Repwise fictives. Les services métier restent inactifs.'

  ;['lgo', 'sub', 'uabb', 'uport', 'udel', 'uexp', 'usv', 'pws', 'pts', 'qs', 'valide', 'refuse', 'repwiseAssistantPhoneRequest', 'repwiseAssistantPhoneVerify', 'repwiseAssistantReportSave', 'repwiseAssistantReportToggle'].forEach(function (id) {
    var button = document.getElementById(id)
    if (button) button.disabled = true
  })

  var hydrationStyle = document.createElement('style')
  hydrationStyle.textContent = '.hy{min-height:116px}.hy .bt{width:48px;height:108px}.hy .bt svg{transform:scale(1.18);transform-origin:center bottom}'
  document.head.appendChild(hydrationStyle)
})()
