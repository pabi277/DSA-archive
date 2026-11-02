import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(full)
    else files.push(path.relative(root, full).replaceAll(path.sep, '/'))
  }
}
await walk(root)
if (!files.includes('index.html')) throw new Error('dist/index.html is missing')
if (files.some((file) => file.includes('copy-web') || file.includes('takeuforward'))) {
  throw new Error('The STUDY-only copied website leaked into dist/')
}
const html = await readFile(path.join(root, 'index.html'), 'utf8')
if (!html.includes('DSA Archive')) throw new Error('Built homepage title is missing')
console.log(`Production output clean: ${files.length} files; no copied-site paths/assets.`)
