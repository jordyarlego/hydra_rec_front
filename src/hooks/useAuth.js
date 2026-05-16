import { useEffect, useState } from 'react'
import { auth } from '../lib/auth.js'

export function useAuth() {
  const [session, setSession] = useState(() => auth.getSession())

  useEffect(() => {
    const refresh = () => setSession(auth.getSession())
    window.addEventListener('storage', refresh)
    window.addEventListener('hydrarec-auth-change', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('hydrarec-auth-change', refresh)
    }
  }, [])

  return {
    session,
    user: session?.user || null,
    isAdmin: auth.isAdmin(session),
    signIn: auth.signIn,
    signOut: auth.signOut,
  }
}
