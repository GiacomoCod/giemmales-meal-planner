# Meal Planner - Project Context

## Panoramica
Meal planner/PWA per organizzare menu, spesa, pulizie, eventi e finanze domestiche.

## Stack Tecnologico
- **Frontend**: React 19.2.4 + TypeScript 5.9 + Vite 8
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Mobile**: Capacitor (iOS/Android)
- **Styling**: Lucide React per le icone
- **Utility**: date-fns per la gestione date

## Struttura Progetto
- PWA con supporto offline
- Funzionalità push notification (web-push)
- Build mobile tramite Capacitor

## Comandi Disponibili
```bash
npm run dev          # Avvia dev server Vite
npm run build        # Build produzione
npm run lint         # Linting con ESLint
npm run preview      # Preview build produzione
npm run cap:sync     # Sync Capacitor
npm run build:mobile # Build + sync per mobile
```

## Configurazione
- Env vars: copiare `.env.example` in `.env.local`
- Firebase config: variabili `VITE_FIREBASE_*`
- Push notification: `WEB_PUSH_VAPID_*` e `FIREBASE_SERVICE_ACCOUNT_JSON`
- Self-signup: controllato da `VITE_ENABLE_SELF_SIGNUP`

## Convenzioni di Sviluppo
- Usare TypeScript per tutto il codice nuovo
- Seguire le regole ESLint configurate
- Componenti React funzionali con hooks
- Import ordinati e consistenti

## Ottimizzazioni Critiche
- **useFirestoreList**: Il parametro `limit` viene applicato lato server (Firestore), non lato client
- **Comparazioni dati**: Usare utility in `src/utils/comparisons.ts` invece di JSON.stringify
- **Memoizzazione**: useMemo/useCallback per query constraints e trasformazioni
- **Cleanup**: Tutti i listener Firestore hanno cleanup automatico in unmount
- **Code Splitting**: Ogni sezione è un chunk separato (~14-20 KB), precaricamento intelligente solo per tab adiacenti
- **Funzioni pure**: `formatNotificationText`, `getPushEmoji` e utility spostate fuori dal componente App
- **IndexedDB Cache**: Cache con TTL differenziati per tutte le collezioni principali (-90-95% letture Firestore)
  - 24h: shoppingList, recipes, tags, events, expenses
  - 6h: notifications (dati freschi)
  - 7gg: mealPlans (cache mensile)
- **Web Workers**: Calcoli pesanti (comparazioni, date, dedupe) in thread separato per UI fluida
- **Immagini WebP/AVIF**: Conversione automatica con vite-plugin-image-optimizer (-76%, -1.87 MB)

## Note Importanti
- Non versionare `ios/App/App/GoogleService-Info.plist`
- Non versionare `android/app/google-services.json`
- Verificare sempre le regole Firebase prima di pubblicare
- Controllare le env vars su Netlify
