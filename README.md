# Home Planner

Meal planner/PWA per organizzare menu, spesa, pulizie, eventi e finanze domestiche.

## Setup locale

1. Copia `.env.example` in `.env.local`.
2. Inserisci la configurazione Firebase web e le eventuali chiavi push.
3. Avvia il progetto con `npm install` e `npm run dev`.

## Config richieste

Le variabili client Firebase sono lette da `VITE_FIREBASE_*`.
Non sono credenziali server, ma vanno comunque tenute fuori dal repository per mantenere il progetto riutilizzabile e più ordinato.

Per le funzioni push server-side servono anche:

- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `FIREBASE_SERVICE_ACCOUNT_JSON` per Netlify/functions quando non si usa `applicationDefault()`

## Registrazione utenti

La registrazione self-service è controllata da `VITE_ENABLE_SELF_SIGNUP`.

- `false`: solo login, più sicuro per istanze private/familiari
- `true`: abilita anche la creazione account dalla schermata di login

## Mobile config locali

Questi file non vanno versionati:

- `ios/App/App/GoogleService-Info.plist`
- `android/app/google-services.json`

Nel repository trovi solo template/esempi. In questo momento il repository e il flusso supportato sono orientati alla versione web/PWA, non a una build Firebase nativa per App Store o Play Store.

## Nota sicurezza

Prima di pubblicare il repository:

- verifica le regole Firebase/Auth/Firestore/Storage lato progetto
- controlla le env vars su Netlify
- ruota eventuali chiavi se in passato sono finite per errore nel repository
