let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
let SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY
const STORAGE_KEY = 'hydrarec_admin_session'

function decodeJwt(token) {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function normalizeSession(data) {
  const accessToken = data?.access_token
  const user = data?.user || decodeJwt(accessToken)
  return accessToken ? { access_token: accessToken, user } : null
}

async function getPublicConfig() {
  if (SUPABASE_URL && SUPABASE_KEY) return
  const res = await fetch('/api/public-config')
  if (!res.ok) throw new Error('Configuração pública do Supabase indisponível.')
  const data = await res.json()
  SUPABASE_URL = data.supabaseUrl
  SUPABASE_KEY = data.supabaseAnonKey
}

export const auth = {
  getSession() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const session = JSON.parse(raw)
      const payload = decodeJwt(session.access_token)
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return session
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  },

  async signIn(email, password) {
    await getPublicConfig()
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Configure SUPABASE_URL e SUPABASE_KEY no backend.')
    }
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error_description || err.msg || 'Login inválido.')
    }
    const session = normalizeSession(await res.json())
    if (!session) throw new Error('Sessão inválida.')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    window.dispatchEvent(new Event('hydrarec-auth-change'))
    return session
  },

  signOut() {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('hydrarec-auth-change'))
  },

  isAdmin(session) {
    const user = session?.user || decodeJwt(session?.access_token)
    const meta = user?.user_metadata || user?.app_metadata || {}
    return meta.role === 'admin'
  },
}
