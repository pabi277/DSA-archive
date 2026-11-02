import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')
const html = await readFile(path.join(root, 'index.html'), 'utf8')
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
for (const reference of references) {
  if (/^(?:https?:|data:|#|\/\/)/i.test(reference)) continue
  const cleanPath = decodeURIComponent(reference.split(/[?#]/, 1)[0]).replace(/^\/+/, '')
  await access(path.resolve(root, cleanPath))
}
console.log(`Built HTML links/assets resolved: ${references.length} references checked.`)
