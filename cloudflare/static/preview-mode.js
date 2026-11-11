// Turn the original Repwise SPA into a read-only, visibly fictitious preview.
(function () {
  var tab = document.getElementById('cassandreNav')
  if (tab) tab.hidden = false

  var notice = document.getElementById('cassandreReadOnlyNotice')
  if (notice) {
    notice.hidden = false
    notice.textContent = 'Cassandre est présentée en aperçu. Aucune mission réelle n’est consultée et aucun agent n’est exécuté.'
  }

  var heading = document.getElementById('cassandreAgents')
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

  var command = document.getElementById('cassandreMessage')
  if (command) {
    command.value = ''
    command.placeholder = 'Les commandes seront disponibles après configuration d’un backend de test.'
    command.disabled = true
  }
  var send = document.getElementById('cassandreSend')
  if (send) {
    send.disabled = true
    send.textContent = 'Commandes désactivées en mode aperçu'
  }

  var feedback = document.getElementById('cassandreFeedback')
  if (feedback) feedback.textContent = 'Aucune connexion à Supabase : les missions réelles ne sont pas chargées.'
  var requests = document.getElementById('cassandreRequests')
  if (requests) requests.textContent = 'Aucune mission réelle chargée en mode aperçu.'

  ;['lgo', 'lsw', 'lfg', 'fps', 'rps', 'sub', 'uabb', 'uport', 'udel', 'uexp', 'usv', 'pws', 'pts', 'qs', 'valide', 'refuse'].forEach(function (id) {
    var button = document.getElementById(id)
    if (button) button.disabled = true
  })
  var subscription = document.getElementById('sub')
  if (subscription) subscription.textContent = 'Abonnement désactivé en mode aperçu'
})()
