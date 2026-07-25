import type { UserRole } from '@/types'

const OAUTH_RETURN_PATH_KEY = 'bitdoin_oauth_return_path'

export function sanitizeAuthReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'

  const path = value.split(/[?#]/, 1)[0]
  if (
    path === '/bookstore'
    || path.startsWith('/bookstore/')
    || path === '/academy'
    || path.startsWith('/academy/')
  ) {
    return path
  }

  return '/'
}

export function resolvePostLoginDestination(returnPath: unknown, role: UserRole | null): string {
  const safeReturnPath = sanitizeAuthReturnPath(returnPath)
  if (role === 'CUSTOMER' || !role) return safeReturnPath
  return safeReturnPath.startsWith('/academy') ? '/academy-admin' : '/admin'
}

export function rememberOAuthReturnPath(returnPath: unknown) {
  sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, sanitizeAuthReturnPath(returnPath))
}

export function takeOAuthReturnPath(): string | null {
  const returnPath = sessionStorage.getItem(OAUTH_RETURN_PATH_KEY)
  if (returnPath === null) return null
  sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY)
  return sanitizeAuthReturnPath(returnPath)
}
