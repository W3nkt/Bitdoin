import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { rememberOAuthReturnPath } from '@/lib/authRedirect'
import type { User, UserRole } from '@/types'

interface AuthResult {
  error: string | null
  role: UserRole | null
}

interface AuthContextValue {
  session: Session | null
  supabaseUser: SupabaseUser | null
  profile: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signInWithOtp: (phone: string) => Promise<{ error: string | null }>
  verifyOtp: (phone: string, token: string) => Promise<AuthResult>
  signInWithGoogle: (returnPath?: string) => Promise<void>
  signInWithFacebook: (returnPath?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('id,name,phone,email,avatar_url,cover_image_url,role,language,currency,created_at,updated_at')
      .eq('id', userId)
      .single()
    const nextProfile = data as User | null
    setProfile(nextProfile)
    return nextProfile
  }

  async function refreshProfile() {
    if (supabaseUser) await fetchProfile(supabaseUser.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setSupabaseUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return { error: error?.message ?? null, role: null }
    const signedInProfile = await fetchProfile(data.user.id)
    return { error: null, role: signedInProfile?.role ?? null }
  }

  async function signUpWithEmail(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    return { error: error?.message ?? null }
  }

  async function signInWithOtp(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    return { error: error?.message ?? null }
  }

  async function verifyOtp(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error || !data.user) return { error: error?.message ?? null, role: null }
    const signedInProfile = await fetchProfile(data.user.id)
    return { error: null, role: signedInProfile?.role ?? null }
  }

  async function signInWithGoogle(returnPath = '/') {
    rememberOAuthReturnPath(returnPath)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signInWithFacebook(returnPath = '/') {
    rememberOAuthReturnPath(returnPath)
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      session, supabaseUser, profile, loading,
      signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle, signInWithFacebook, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
