import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { writeServiceWorker } from './tools/build-sw.mjs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dsa-archive-pwa-sw',
      apply: 'build',
      async closeBundle() {
        await writeServiceWorker()
      },
    },
  ],
  server: { allowedHosts: ['.e2b.app'] },
  preview: { allowedHosts: ['.e2b.app'] },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'catalogue', test: /data[\\/]problems\.json/ },
            { name: 'firebase-transport', test: /node_modules[\\/]@firebase[\\/]webchannel-wrapper/ },
            { name: 'firebase-firestore', test: /node_modules[\\/]@firebase[\\/]firestore/ },
            { name: 'firebase-auth', test: /node_modules[\\/]@firebase[\\/]auth/ },
            { name: 'firebase-core', test: /node_modules[\\/](?:firebase|@firebase)[\\/]/ },
            { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
