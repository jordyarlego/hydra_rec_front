// Auth Supabase — login + refresh proativo.
// V2 (Triagem v2): salva refresh_token e expires_at; getSession faz refresh
// proativo quando faltar < 60s pra expirar; auth.refresh() pode ser chamado
// pelo adminFetch quando der 401.

let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
let SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY
const STORAGE_KEY = 'hydrarec_admin_session'
const REFRESH_BUFFER_S = 60        // refresh proativo se faltar <= 60s
let _refreshPromise = null         // dedup de refresh concorrente

function decodeJwt(token) {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function normalizeSession(data) {
  const accessToken = data?.access_token
  if (!accessToken) return null
  const user = data?.user || decodeJwt(accessToken)
  const decoded = decodeJwt(accessToken)
  return {
    access_token: accessToken,
    refresh_token: data?.refresh_token || null,
    expires_at: data?.expires_at || (decoded?.exp ?? null),
    user,
  }
}

async function getPublicConfig() {
  if (SUPABASE_URL && SUPABASE_KEY) return
  const res = await fetch('/api/public-config')
  if (!res.ok) throw new Error('Configuração pública do Supabase indisponível.')
  const data = await res.json()
  SUPABASE_URL = data.supabaseUrl
  SUPABASE_KEY = data.supabaseAnonKey
}

function readStored() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function persist(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function dispatchChange() {
  window.dispatchEvent(new Event('hydrarec-auth-change'))
}

function dispatchExpired() {
  window.dispatchEvent(new Event('hydrarec-auth-expired'))
}

async function doRefresh(refreshToken) {
  await getPublicConfig()
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  if (!refreshToken) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const session = normalizeSession(await res.json())
  if (!session) return null
  persist(session)
  dispatchChange()
  return session
}

export const auth = {
  // Sincrono — retorna o que estiver no storage; pode estar perto de expirar.
  // Para refresh proativo use getSessionFresh() (async).
  getSession() {
    const session = readStored()
    if (!session?.access_token) return null
    const exp = session.expires_at ?? decodeJwt(session.access_token)?.exp
    if (exp && exp * 1000 < Date.now()) {
      persist(null)
      return null
    }
    return session
  },

  // Async — faz refresh proativo se faltar < REFRESH_BUFFER_S pra expirar.
  // Retorna null se sessão é irrecuperável (dispatcha 'hydrarec-auth-expired').
  async getSessionFresh() {
    const session = readStored()
    if (!session?.access_token) return null
    const exp = session.expires_at ?? decodeJwt(session.access_token)?.exp
    const secondsLeft = exp ? exp - nowSeconds() : Infinity

    if (secondsLeft > REFRESH_BUFFER_S) return session

    // Precisa refresh — dedup chamadas concorrentes
    if (!_refreshPromise) {
      _refreshPromise = doRefresh(session.refresh_token).finally(() => { _refreshPromise = null })
    }
    const refreshed = await _refreshPromise
    if (!refreshed) {
      persist(null)
      dispatchExpired()
      return null
    }
    return refreshed
  },

  // Refresh forçado — usado pelo adminFetch quando recebe 401.
  async refresh() {
    const session = readStored()
    if (!session?.refresh_token) return null
    if (!_refreshPromise) {
      _refreshPromise = doRefresh(session.refresh_token).finally(() => { _refreshPromise = null })
    }
    const refreshed = await _refreshPromise
    if (!refreshed) {
      persist(null)
      dispatchExpired()
      return null
    }
    return refreshed
  },

  async signIn(email, password) {
    await getPublicConfig()
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Configure SUPABASE_URL e SUPABASE_KEY no backend.')
    }
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error_description || err.msg || 'Login inválido.')
    }
    const session = normalizeSession(await res.json())
    if (!session) throw new Error('Sessão inválida.')
    persist(session)
    dispatchChange()
    return session
  },

  signOut() {
    persist(null)
    dispatchChange()
  },

  isAdmin(session) {
    const user = session?.user || decodeJwt(session?.access_token)
    const meta = user?.user_metadata || user?.app_metadata || {}
    return meta.role === 'admin'
  },
}
