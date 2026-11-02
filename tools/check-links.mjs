import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')
const htmlFiles = ['index.html', 'offline.html', '404.html']
let checked = 0

for (const page of htmlFiles) {
  const html = await readFile(path.join(root, page), 'utf8')
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
  for (const reference of references) {
    if (/^(?:https?:|data:|#|\/\/)/i.test(reference)) continue
    const cleanPath = decodeURIComponent(reference.split(/[?#]/, 1)[0]).replace(/^\/+/, '')
    if (cleanPath === '') continue
    await access(path.resolve(root, cleanPath))
    checked += 1
  }
}

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'))
for (const icon of manifest.icons ?? []) {
  const cleanPath = String(icon.src ?? '').replace(/^\/+/, '')
  if (!cleanPath) throw new Error('manifest.webmanifest contains an icon with an empty src')
  await access(path.resolve(root, cleanPath))
  checked += 1
}

console.log(`Built HTML & manifest links/assets resolved: ${checked} references checked.`)
