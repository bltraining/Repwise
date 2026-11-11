// Turn the original Repwise SPA into a read-only, visibly fictitious preview.
(function () {
  var tab = document.getElementById('repwiseAssistantNav')
  if (tab) tab.hidden = false

  var notice = document.getElementById('repwiseAssistantReadOnlyNotice')
  if (notice) {
    notice.hidden = false
    notice.textContent = 'Assistant Repwise est présenté en aperçu. Aucune mission réelle n’est consultée et aucun agent n’est exécuté.'
  }

  var heading = document.getElementById('repwiseAssistantAgents')
  if (heading) {
    heading.hidden = false
    if (heading.previousElementSibling) heading.previousElementSibling.hidden = false
    heading.replaceChildren()
    ;[
      ['Commercial', 'Ventes et conversions'],
      ['Clients', 'Activité et fidélisation'],
      ['Nutrition', 'Plans et journaux'],
      ['Programmes', 'Qualité des entraînements'],
      ['Technique', 'Incidents et intégrations'],
      ['Financier', 'Indicateurs, sans action financière'],
    ].forEach(function (agent) {
      var card = document.createElement('article')
      card.className = 'cass-agent'
      var name = document.createElement('b')
      name.textContent = agent[0]
      var status = document.createElement('span')
      status.textContent = 'APERÇU · INACTIF'
      var mission = document.createElement('span')
      mission.className = 'cass-meta'
      mission.textContent = agent[1]
      card.append(name, status, mission)
      heading.appendChild(card)
    })
  }

  var command = document.getElementById('repwiseAssistantMessage')
  if (command) {
    command.value = ''
    command.placeholder = 'Les commandes seront disponibles après configuration d’un backend de test.'
    command.disabled = true
  }
  var send = document.getElementById('repwiseAssistantSend')
  if (send) {
    send.disabled = true
    send.textContent = 'Commandes désactivées en mode aperçu'
  }

  var feedback = document.getElementById('repwiseAssistantFeedback')
  if (feedback) feedback.textContent = 'Aucune connexion à Supabase : les missions réelles ne sont pas chargées.'
  var requests = document.getElementById('repwiseAssistantRequests')
  if (requests) requests.textContent = 'Aucune mission réelle chargée en mode aperçu.'

  ;['repwiseAssistantReports', 'repwiseAssistantApprovals', 'repwiseAssistantWhatsapp', 'repwiseAssistantWhatsAppHistory'].forEach(function (id) {
    var panel = document.getElementById(id)
    if (!panel) return
    panel.hidden = true
    var section = panel.previousElementSibling
    if (section && section.classList.contains('lab')) section.hidden = true
  })
  var reportHour = document.getElementById('repwiseAssistantReportHour')
  var reportPanel = reportHour && reportHour.closest('.panel')
  if (reportPanel) {
    reportPanel.hidden = true
    if (reportPanel.previousElementSibling) reportPanel.previousElementSibling.hidden = true
  }

  ;['lgo', 'lsw', 'lfg', 'fps', 'rps', 'sub', 'uabb', 'uport', 'udel', 'uexp', 'usv', 'pws', 'pts', 'qs', 'valide', 'refuse', 'repwiseAssistantPhoneRequest', 'repwiseAssistantPhoneVerify', 'repwiseAssistantReportSave', 'repwiseAssistantReportToggle'].forEach(function (id) {
    var button = document.getElementById(id)
    if (button) button.disabled = true
  })
  var subscription = document.getElementById('sub')
  if (subscription) subscription.textContent = 'Abonnement désactivé en mode aperçu'

  var hydrationStyle = document.createElement('style')
  hydrationStyle.textContent = '.hy{min-height:116px}.hy .bt{width:48px;height:108px}.hy .bt svg{transform:scale(1.18);transform-origin:center bottom}'
  document.head.appendChild(hydrationStyle)
})()
