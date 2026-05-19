# Agents

## Developer Commands

```bash
npm run dev      # Start dev server (localhost)
npm run build    # Typecheck + build: tsc -b && vite build
npm run lint     # ESLint check
npm run cap:sync # Sync Capacitor (web -> native)
```

## Required Setup

1. Copy `.env.example` to `.env.local`
2. Add Firebase `VITE_FIREBASE_*` variables (all required, throws if missing at runtime)

Node: 22.17.1 (see `.nvmrc`)

## Build & Bundling

- PWA enabled via `vite-plugin-pwa`, service worker disabled in dev
- Images optimized to WebP/AVIF on build (`vite-plugin-image-optimizer`)
- Manual chunks: `vendor-firebase`, `vendor-date`, `vendor-icons`, `vendor-react`

## Key Code Patterns

- Firebase auth uses `indexedDBLocalPersistence` + `browserLocalPersistence` (see `src/firebase.ts:27-29`)
- Web workers in `src/workers/*.ts` imported via custom hooks (`useCalendarWorker`, etc.)
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`

## No Test Suite

No test scripts in `package.json`. Do not add testing infrastructure unless explicitly requested.

## Lint & Typecheck Before Commit

Run `npm run lint` before committing. Typecheck is included in `npm run build`.