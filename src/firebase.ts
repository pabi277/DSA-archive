/**
 * Phase 2 / Phase 6 Firebase wiring — Auth + Firestore only, Spark whitelist.
 *
 * Production builds read the owner's public Spark web identifiers for
 * `dsa-archive` from `.env.production` (or a local `.env.local` override);
 * `VITE_FIREBASE_USE_EMULATOR=true` forces isolated `demo-dsa-archive`
 * emulator mode for dev/CI. Firebase Analytics (`getAnalytics` /
 * `measurementId`) is intentionally omitted per `rule.md` §5. Firebase web
 * config is NOT a secret and is NOT the protection: `firestore.rules` is.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  type Firestore,
} from 'firebase/firestore'

export type FirebaseMode = 'emulator' | 'live' | 'unconfigured'

const env = import.meta.env
const useEmulator = env.VITE_FIREBASE_USE_EMULATOR === 'true'
export const emulatorHost = env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'
export const emulatorProjectId = env.VITE_FIREBASE_PROJECT_ID || 'demo-dsa-archive'

const liveConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
}
const hasLiveConfig = Boolean(
  liveConfig.apiKey && liveConfig.authDomain && liveConfig.projectId && liveConfig.appId,
)

const emulatorConfig = {
  apiKey: 'demo-api-key',
  authDomain: `${emulatorProjectId}.firebaseapp.com`,
  projectId: emulatorProjectId,
  appId: '1:000000000000:web:demo',
  messagingSenderId: '000000000000',
}

const config = useEmulator ? emulatorConfig : hasLiveConfig ? liveConfig : null
export const firebaseMode: FirebaseMode = useEmulator
  ? 'emulator'
  : hasLiveConfig
    ? 'live'
    : 'unconfigured'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

if (config) {
  app = getApps()[0] ?? initializeApp(config)
  auth = getAuth(app)
  try {
    // IndexedDB-backed cache is the offline-first requirement; a browser that
    // blocks it falls back to the SDK's in-memory cache rather than failing.
    db = initializeFirestore(app, { localCache: persistentLocalCache() })
  } catch {
    db = getFirestore(app)
  }
  if (useEmulator) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, emulatorHost, 8080)
  }
}

export { auth, db }
