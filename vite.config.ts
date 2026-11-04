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
    // Modern-evergreen baseline (React 19 + PWA already require it): keeps
    // the modulepreload polyfill and down-level helpers out of the shell.
    target: 'esnext',
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'catalogue-a', test: /data[\\/]catalogue[\\/]catalogue-a\.json/ },
            { name: 'catalogue-b', test: /data[\\/]catalogue[\\/]catalogue-b\.json/ },
            { name: 'catalogue-c', test: /data[\\/]catalogue[\\/]catalogue-c\.json/ },
            { name: 'catalogue-d', test: /data[\\/]catalogue[\\/]catalogue-d\.json/ },
            { name: 'content-data', test: /data[\\/]content[\\/](?:topics|problems)[\\/]|data[\\/]content[\\/]coverage\.json/ },
            { name: 'practice-data', test: /data[\\/]practice-sets[\\/]/ },
            { name: 'content-ui', test: /src[\\/](?:content[\\/]|app[\\/](?:problemScreen|practiceScreen)\.tsx|topics[\\/]topicPage\.tsx)/ },
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
