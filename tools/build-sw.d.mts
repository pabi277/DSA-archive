export function writeServiceWorker(distDir?: string): Promise<{
  cacheName: string
  precacheCount: number
}>
