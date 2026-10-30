import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { rememberOAuthReturnPath } from '@/lib/authRedirect'
import { clearAllDrafts } from '@/lib/academic/drafts'
import { discardUsageEvents, resumeUsageEvents } from '@/lib/academic/usageEvents'
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
  /** In the app, Facebook opens the Facebook app; the error says what to tell the person. */
  signInWithFacebook: (returnPath?: string) => Promise<{ error: 'no_email' | 'failed' | null; detail?: string }>
  signInWithApple: (returnPath?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const AUTH_STARTUP_TIMEOUT_MS = 10_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  // Shared phones: when the account changes (sign-out, expiry, someone else
  // signing in), nothing loaded for the previous account may be shown or sent.
  const accountId = useRef<string | null | undefined>(undefined)
  const forgetPreviousAccount = (nextId: string | null) => {
    if (accountId.current !== undefined && accountId.current !== nextId) {
      queryClient.clear()
      discardUsageEvents()
      resumeUsageEvents()
    }
    accountId.current = nextId
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('id,name,phone,email,avatar_url,cover_image_url,member_code,role,language,currency,created_at,updated_at')
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
    let active = true
    let authEventHandled = false

    const applySession = (nextSession: Session | null) => {
      if (!active) return
      forgetPreviousAccount(nextSession?.user?.id ?? null)
      setSession(nextSession)
      setSupabaseUser(nextSession?.user ?? null)

      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Do not await another Supabase call from inside onAuthStateChange.
      // The auth client may still hold its internal lock while invoking it.
      void fetchProfile(nextSession.user.id).finally(() => {
        if (active) setLoading(false)
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventHandled = true
      applySession(nextSession)
    })

    const startupTimeout = window.setTimeout(() => {
      if (active) setLoading(false)
    }, AUTH_STARTUP_TIMEOUT_MS)

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!authEventHandled) applySession(initialSession)
    }).catch(() => {
      if (active) setLoading(false)
    }).finally(() => {
      window.clearTimeout(startupTimeout)
    })

    return () => {
      active = false
      window.clearTimeout(startupTimeout)
      subscription.unsubscribe()
    }
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

  async function signInWithProvider(provider: 'google' | 'facebook' | 'apple', returnPath: string) {
    rememberOAuthReturnPath(returnPath)
    if (__NATIVE_BUILD__) {
      // The app signs in through the system browser and returns by custom scheme.
      try {
        const { startNativeOAuth } = await import('@/lib/nativeOAuth')
        await startNativeOAuth(provider)
      } catch (error) {
        console.error('[native-oauth]', error)
      }
      return
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
  }

  async function signInWithGoogle(returnPath = '/') {
    await signInWithProvider('google', returnPath)
  }

  async function signInWithFacebook(returnPath = '/'): Promise<{ error: 'no_email' | 'failed' | null; detail?: string }> {
    if (__NATIVE_BUILD__) {
      // Facebook's own login SDK, when this build has the Facebook app settings (see nativeFacebook.ts).
      // Otherwise Facebook uses the browser like Google and Apple.
      try {
        const { facebookAppConfigured, signInWithFacebookApp } = await import('@/lib/nativeFacebook')
        if (facebookAppConfigured) {
          rememberOAuthReturnPath(returnPath)
          await signInWithFacebookApp()
          return { error: null }
        }
      } catch (error) {
        console.error('[facebook-app]', error)
        const { code, detail } = error as { code?: string; detail?: string }
        return { error: code === 'no_email' ? 'no_email' : 'failed', detail }
      }
    }
    await signInWithProvider('facebook', returnPath)
    return { error: null }
  }

  async function signInWithApple(returnPath = '/') {
    await signInWithProvider('apple', returnPath)
  }

  async function signOut() {
    await supabase.auth.signOut()
    // Shared phones: My Scores drafts must not outlive the account session.
    clearAllDrafts()
    forgetPreviousAccount(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      session, supabaseUser, profile, loading,
      signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle, signInWithFacebook, signInWithApple, signOut, refreshProfile,
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
