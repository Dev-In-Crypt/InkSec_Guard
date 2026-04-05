// Bootstrap: polyfill globalThis.crypto before loading any TypeScript
// (ESM static imports hoist, so polyfill must run before index.ts is dynamically imported)
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

await import('./src/index.ts')
