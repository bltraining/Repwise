// This file intentionally contains no internal assistant name or privileged data.
(function () {
  var login = document.getElementById('login')
  var avatar = document.getElementById('av')
  var submit = document.getElementById('lgo')
  var email = document.getElementById('le')
  var password = document.getElementById('lp')
  var message = document.getElementById('lmsg')
  var error = document.getElementById('lerr')
  var nav = document.querySelector('.nav')
  var panel = null
  var tab = null

  if (!login || !avatar || !submit || !email || !password || !nav) return

  function showLogin() {
    document.getElementById('set')?.classList.remove('on')
    login.classList.add('on')
    message.textContent = 'Connecte-toi avec le compte autorisé.'
    error.textContent = ''
    email.focus()
  }

  function closeLogin() {
    login.classList.remove('on')
    password.value = ''
  }

  function node(tag, className, text) {
    var element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined && text !== null) element.textContent = String(text)
    return element
  }

  function section(title, items, emptyText) {
    var block = node('section', 'panel')
    block.append(node('div', 'lab', title))
    if (!items.length) block.append(node('p', 'sub', emptyText))
    items.forEach(function (item) {
      var card = node('article', 'cass-card')
      card.append(node('b', '', item.title || item.name || 'Élément'))
      if (item.status) card.append(node('div', 'cass-meta', item.status))
      if (item.mission) card.append(node('p', 'cass-result', item.mission))
      if (item.summary) card.append(node('p', 'cass-result', item.summary))
      block.append(card)
    })
    return block
  }

  function hidePanel() {
    panel?.remove()
    tab?.remove()
    panel = null
    tab = null
  }

  function showPanel(data) {
    hidePanel()
    tab = node('button', '', data.display_name)
    tab.type = 'button'
    tab.dataset.privateSession = 'true'
    panel = node('div', 'view')

    var content = node('div', 'wrap')
    content.append(node('h1', '', data.display_name))
    content.append(node('p', 'sub', data.read_only ? 'Espace de direction · consultation uniquement' : 'Espace indisponible'))
    if (!data.data_available) content.append(node('p', 'sub', 'Les données de missions et rapports ne sont pas encore configurées dans l’environnement de test.'))
    content.append(section('Agents', data.agents || [], 'Aucune fiche agent disponible.'))
    content.append(section('Missions', (data.tasks || []).map(function (item) {
      return { title: item.title, status: item.status, summary: item.result?.summary }
    }), 'Aucune mission disponible.'))
    content.append(section('Rapports', (data.reports || []).map(function (item) {
      return { title: item.report_date || 'Rapport', summary: item.executive_summary }
    }), 'Aucun rapport disponible.'))
    content.append(section('Alertes', (data.decisions || []).map(function (item) {
      return { title: item.summary || item.decision_type, status: item.status, summary: item.rationale }
    }), 'Aucune alerte disponible.'))

    var logout = node('button', 'rm', 'Se déconnecter')
    logout.type = 'button'
    logout.addEventListener('click', signOut)
    content.append(logout)
    panel.append(content)
    nav.append(tab)

    tab.addEventListener('click', function () {
      document.querySelectorAll('.nav button').forEach(function (button) { button.classList.remove('on') })
      document.querySelectorAll('.view').forEach(function (view) { view.classList.remove('on') })
      tab.classList.add('on')
      panel.classList.add('on')
    })
    tab.click()
    avatar.textContent = 'RP'
    avatar.setAttribute('aria-label', 'Compte Repwise')
  }

  async function requestPanel() {
    var response = await fetch('/api/founder-panel', { credentials: 'same-origin', cache: 'no-store' })
    if (response.status === 401 || response.status === 403) {
      hidePanel()
      return false
    }
    if (!response.ok) return false
    var data = await response.json()
    if (data.read_only !== true || typeof data.display_name !== 'string' || !Array.isArray(data.agents)) return false
    showPanel(data)
    return true
  }

  async function signOut() {
    try { await fetch('/api/repwise-session', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' }) } catch {}
    var hadSession = !!tab
    hidePanel()
    avatar.textContent = 'RP'
    avatar.setAttribute('aria-label', 'Connexion Repwise')
    login.classList.remove('on')
    if (hadSession) document.querySelector('.nav button[data-v="c"]')?.click()
  }

  async function submitCredentials(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    submit.disabled = true
    error.textContent = ''
    try {
      var response = await fetch('/api/repwise-session', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), password: password.value }),
      })
      password.value = ''
      if (response.status === 401) throw new Error('E-mail ou mot de passe incorrect.')
      if (response.status === 403) throw new Error('Ce compte ne peut pas ouvrir cette interface.')
      if (!response.ok) throw new Error('Connexion indisponible dans cet environnement.')
      if (!await requestPanel()) throw new Error('Connexion indisponible dans cet environnement.')
      closeLogin()
    } catch (cause) {
      error.textContent = cause.message || 'Connexion impossible.'
    } finally {
      submit.disabled = false
    }
  }

  avatar.textContent = 'RP'
  avatar.setAttribute('aria-label', 'Connexion Repwise')
  avatar.title = 'Connexion Repwise'
  avatar.onclick = showLogin

  submit.disabled = false
  submit.textContent = 'Se connecter'
  submit.addEventListener('click', submitCredentials, true)
  password.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.stopImmediatePropagation()
    submit.click()
  }, true)

  ;['lsw', 'lfg', 'fps', 'rps', 'ln', 'lcgw'].forEach(function (id) {
    var element = document.getElementById(id)
    if (element) element.hidden = true
  })
  var account = document.getElementById('set')
  if (account) account.classList.remove('on')

  requestPanel().catch(function () { hidePanel() })
})()
