const status = document.querySelector('#cassandre-status')
const form = document.querySelector('#cassandre-login')
const output = document.querySelector('#cassandre-result')
const signout = document.querySelector('#cassandre-signout')
const command = document.querySelector('#cassandre-query')
let client

function show(message) { status.textContent = message }
function renderTasks(tasks) {
  output.replaceChildren()
  if (!tasks.length) {
    const empty = document.createElement('p')
    empty.textContent = 'Aucune mission enregistrée.'
    output.append(empty)
    return
  }
  for (const task of tasks) {
    const item = document.createElement('article')
    item.className = 'card'
    const heading = document.createElement('strong')
    heading.textContent = `${task.agent} — ${task.title}`
    const detail = document.createElement('p')
    detail.className = 'muted'
    detail.textContent = `${task.status}${task.summary ? ` · ${task.summary}` : ''}`
    item.append(heading, detail)
    output.append(item)
  }
}

async function init() {
  try {
    const response = await fetch('/api/runtime-config', { cache: 'no-store' })
    if (!response.ok) throw new Error('not configured')
    const config = await response.json()
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
    const { data: { session } } = await client.auth.getSession()
    updateSession(session)
    client.auth.onAuthStateChange((_event, nextSession) => updateSession(nextSession))
  } catch {
    show('Consultation indisponible : le Supabase de test et ses fonctions ne sont pas configurés.')
  }
}

function updateSession(session) {
  const authenticated = Boolean(session)
  form.hidden = authenticated || !client
  signout.hidden = !authenticated
  command.disabled = !authenticated
  show(authenticated ? 'Compte connecté · accès fondateur vérifié côté serveur à chaque commande.' : 'Connecte-toi avec le compte fondateur du Supabase de test.')
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  if (!client) return
  const email = form.elements.email.value.trim()
  const password = form.elements.password.value
  const { error } = await client.auth.signInWithPassword({ email, password })
  form.elements.password.value = ''
  if (error) show('Connexion refusée. Vérifie les identifiants du compte test.')
})

signout.addEventListener('click', async () => { await client?.auth.signOut(); output.replaceChildren() })
command.addEventListener('click', async () => {
  const { data: { session } } = await client.auth.getSession()
  if (!session) return show('Reconnecte-toi pour continuer.')
  command.disabled = true
  show('Lecture des missions…')
  try {
    const response = await fetch('/api/cassandre-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ message: 'Où en sont mes missions ?' }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    renderTasks(result.tasks)
    show('Missions chargées depuis le Supabase de test.')
  } catch {
    show('Consultation indisponible. Aucune mission n’a été lancée.')
  } finally {
    command.disabled = false
  }
})

init()
