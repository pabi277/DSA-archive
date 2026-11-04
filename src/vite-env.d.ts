/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_USE_EMULATOR?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_EMULATOR_HOST?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'virtual:dsa-catalogue' {
  const packed: unknown[]
  export default packed
}

declare module 'virtual:dsa-content' {
  const bundle: unknown[]
  export default bundle
}
