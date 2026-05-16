// adminFetch — wrapper de fetch pra endpoints /api/admin/*.
//
// Faz:
//   1. Refresh proativo da sessão (auth.getSessionFresh) antes da chamada
//   2. Adiciona Authorization: Bearer <token>
//   3. Em 401: tenta auth.refresh() uma vez e re-executa
//   4. Se ainda 401: dispatcha hydrarec-auth-expired e levanta erro
//
// Componentes admin devem usar isso no lugar de fetch direto.

import { auth } from './auth.js'

export class AuthExpiredError extends Error {
  constructor(message = 'Sessão expirada.') {
    super(message)
    this.name = 'AuthExpiredError'
  }
}

function withAuthHeaders(opts, token) {
  return {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  }
}

export async function adminFetch(url, opts = {}) {
  let session = await auth.getSessionFresh()
  if (!session?.access_token) {
    throw new AuthExpiredError()
  }

  let res = await fetch(url, withAuthHeaders(opts, session.access_token))
  if (res.status !== 401) return res

  // 401 — tenta refresh + retry 1x
  session = await auth.refresh()
  if (!session?.access_token) {
    throw new AuthExpiredError()
  }
  res = await fetch(url, withAuthHeaders(opts, session.access_token))
  if (res.status === 401) {
    // Refresh funcionou mas ainda 401 — provavelmente role removida ou JWT inválido
    throw new AuthExpiredError('Sessão renovada ainda retornou 401.')
  }
  return res
}

// Helper para JSON GET — caso comum (não pra POST com body de form).
export async function adminFetchJson(url, opts = {}) {
  const res = await adminFetch(url, opts)
  if (!res.ok) {
    let detail
    try {
      const data = await res.json()
      detail = data.detail || data.error || `HTTP ${res.status}`
    } catch {
      detail = `HTTP ${res.status}`
    }
    const err = new Error(detail)
    err.status = res.status
    throw err
  }
  return res.json()
}
