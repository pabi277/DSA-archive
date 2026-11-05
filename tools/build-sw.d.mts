export function isRuntimeAsset(rel: string): boolean

export function writeServiceWorker(distDir?: string): Promise<{
  cacheName: string
  precacheCount: number
  runtimeCount: number
}>
