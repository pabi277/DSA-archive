/**
 * Google Auth state for phase 2. Signed-out browsing never depends on this
 * hook. In the emulator build a deterministic fake Google ID token gives CI a
 * real google.com Auth user without driving the emulator's popup widget.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseMode, type FirebaseMode } from './firebase'

export type AccountStatus = 'unconfigured' | 'loading' | 'signed-out' | 'signed-in'
export type AccountUser = {
  uid: string
  displayName: string
  email: string
  photoURL: string | null
}

export type AccountState = {
  mode: FirebaseMode
  status: AccountStatus
  user: AccountUser | null
  busy: boolean
  error: string | null
  canUseTestGoogle: boolean
  signIn: () => Promise<void>
  signInWithTestGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

/** Stable identity for CI's fresh-profile relogin. Emulator-only, never live. */
export const TEST_GOOGLE_CLAIMS = {
  sub: 'dsa-archive-ci-owner',
  email: 'ci.owner@example.test',
  name: 'CI Owner',
  email_verified: true,
  picture: '',
}

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('popup-closed-by-user')) return 'Google sign-in was cancelled.'
  if (message.includes('network-request-failed')) {
    return 'Could not reach Firebase Authentication. Start the local emulator, or configure the owner-created project.'
  }
  if (message.includes('unauthorized-domain')) {
    return 'This domain is not authorized for Google sign-in yet. Complete the owner console checklist.'
  }
  return `Google sign-in failed: ${message}`
}

export function useAccount(): AccountState {
  const [status, setStatus] = useState<AccountStatus>(auth ? 'loading' : 'unconfigured')
  const [user, setUser] = useState<AccountUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) {
      setStatus('unconfigured')
      setUser(null)
      return
    }
    const currentAuth = auth
    const unsubscribe = onAuthStateChanged(
      currentAuth,
      (next: User | null) => {
        if (!next) {
          setUser(null)
          setStatus('signed-out')
          return
        }
        if (!next.providerData.some((provider) => provider.providerId === 'google.com')) {
          void firebaseSignOut(currentAuth)
          setError('Only Google sign-in is enabled for DSA Archive.')
          setUser(null)
          setStatus('signed-out')
          return
        }
        setUser({
          uid: next.uid,
          displayName: next.displayName || next.email || 'DSA learner',
          email: next.email || '',
          photoURL: next.photoURL || null,
        })
        setError(null)
        setStatus('signed-in')
      },
      (reason) => {
        setError(friendlyAuthError(reason))
        setStatus('signed-out')
      },
    )
    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    if (!auth) {
      setError('Cloud sign-in is not configured yet. The owner must create the Spark project and provide its public web config.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (reason) {
      setError(friendlyAuthError(reason))
    } finally {
      setBusy(false)
    }
  }, [])

  const signInWithTestGoogle = useCallback(async () => {
    if (firebaseMode !== 'emulator' || !auth) {
      setError('The CI test account is available only in an emulator build.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // The Auth Emulator accepts strict JSON as a fake google.com id_token.
      const credential = GoogleAuthProvider.credential(JSON.stringify(TEST_GOOGLE_CLAIMS))
      await signInWithCredential(auth, credential)
    } catch (reason) {
      setError(friendlyAuthError(reason))
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!auth) return
    setBusy(true)
    try {
      await firebaseSignOut(auth)
    } catch (reason) {
      setError(friendlyAuthError(reason))
    } finally {
      setBusy(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    mode: firebaseMode,
    status,
    user,
    busy,
    error,
    canUseTestGoogle: firebaseMode === 'emulator',
    signIn,
    signInWithTestGoogle,
    signOut,
    clearError,
  }
}
