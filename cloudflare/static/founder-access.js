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
    document.querySelector('.wrap')?.append(panel)
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

  function completeInviteFromHash() {
    var params = new URLSearchParams(location.hash.slice(1))
    var authFlow = params.get('type')
    if (authFlow !== 'invite' && authFlow !== 'recovery') return false

    var accessToken = params.get('access_token') || ''
    var refreshToken = params.get('refresh_token') || ''
    history.replaceState(null, '', location.pathname + location.search)
    login.classList.remove('on')

    var overlay = node('div', 'ov on')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Finaliser le compte Repwise')
    overlay.style.zIndex = '1000'
    var content = node('div', 'wrap')
    content.style.paddingTop = '56px'
    content.append(node('h1', '', 'Finaliser ton compte Repwise'))
    content.append(node('p', 'sub', authFlow === 'recovery'
      ? 'Choisis un nouveau mot de passe pour accéder à ton espace.'
      : 'Choisis un mot de passe pour terminer la vérification de ton adresse.'))
    var form = node('div', 'panel')
    var first = node('input', 'tx')
    first.type = 'password'
    first.autocomplete = 'new-password'
    first.minLength = 12
    first.maxLength = 128
    first.placeholder = 'Nouveau mot de passe (12 caractères minimum)'
    var second = node('input', 'tx')
    second.type = 'password'
    second.autocomplete = 'new-password'
    second.minLength = 12
    second.maxLength = 128
    second.placeholder = 'Confirmer le mot de passe'
    var status = node('div', 'sub')
    status.setAttribute('role', 'status')
    var button = node('button', 'btn', 'Enregistrer le mot de passe')
    button.type = 'button'
    form.append(first, second, status, button)
    content.append(form)
    overlay.append(content)
    document.body.append(overlay)

    button.addEventListener('click', async function () {
      status.textContent = ''
      if (!accessToken || !refreshToken) {
        status.textContent = 'Ce lien est incomplet ou expiré. Demande un nouveau lien.'
        return
      }
      if (first.value.length < 12 || first.value.length > 128 || first.value !== second.value) {
        status.textContent = 'Vérifie que les deux mots de passe correspondent et contiennent au moins 12 caractères.'
        return
      }
      button.disabled = true
      try {
        const response = await fetch('/api/complete-founder-invite', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, password: first.value }),
        })
        first.value = ''
        second.value = ''
        if (response.status === 401 || response.status === 403) {
          accessToken = ''
          refreshToken = ''
          throw new Error('Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.')
        }
        if (response.status === 400) throw new Error('Le mot de passe n’a pas été accepté. Essaie-en un autre.')
        if (!response.ok) throw new Error('Impossible de terminer la création du compte. Réessaie dans quelques instants.')
        accessToken = ''
        refreshToken = ''
        overlay.remove()
        if (!await requestPanel()) throw new Error('Compte créé. Recharge la page ou reconnecte-toi.')
      } catch (cause) {
        status.textContent = cause.message || 'Impossible de terminer la création du compte.'
      } finally {
        button.disabled = false
      }
    })

    first.focus()
    return true
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

  if (!completeInviteFromHash()) requestPanel().catch(function () { hidePanel() })
})()
