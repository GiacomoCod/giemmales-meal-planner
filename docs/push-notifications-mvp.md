# Push Notifications MVP (Web + PWA, iPhone incluso)

## 1) Architettura corrente
- Client: `Push API + Service Worker` (no Firebase Messaging SDK lato web push).
- Backend: Netlify Functions + libreria `web-push`.
- Persistenza subscription: Firestore (`pushSubscriptions`).

File principali:
- `src/pushNotifications.ts`
- `public/firebase-messaging-sw.js` (handler push generico)
- `netlify/functions/push-send-test.cjs`
- `netlify/functions/push-send-reminder.cjs`
- `netlify/functions/_push-common.cjs`

## 2) Chiavi VAPID
Per Web Push standard servono **public + private key**.

Se hai solo la public key da Firebase Console, non basta per inviare con `web-push`.
Genera una coppia completa:

```bash
npx web-push generate-vapid-keys --json
```

Otterrai:
- `publicKey`
- `privateKey`

## 3) Variabili ambiente
Client locale (`.env.local`):

```bash
VITE_FIREBASE_VAPID_KEY=<PUBLIC_KEY_VAPID>
```

Server Netlify:
- `WEB_PUSH_VAPID_PUBLIC_KEY=<PUBLIC_KEY_VAPID>`
- `WEB_PUSH_VAPID_PRIVATE_KEY=<PRIVATE_KEY_VAPID>`
- `WEB_PUSH_SUBJECT=mailto:you@example.com`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<json service account>`
- `PUSH_TEST_API_KEY=<api key endpoint>`

## 4) Struttura Firestore
Collezione:
- `pushSubscriptions` (profilo principale)
- `profiles/{profileId}/pushSubscriptions` (altri profili)

Documento:
- id: `encodeURIComponent(endpoint)`
- campi:
  - `endpoint`
  - `keys.p256dh`
  - `keys.auth`
  - `userId`, `profileId`, `enabled`, `permission`
  - `userAgent`, `language`, `platform`, `updatedAt`

## 5) Endpoint disponibili
`POST /api/push/send-test`
- body esempio:
```json
{
  "profileId": "giemmale",
  "title": "Test",
  "body": "Push ok",
  "url": "/?tab=planner"
}
```

`POST /api/push/send-reminder`
- body minimo:
```json
{
  "profileId": "giemmale",
  "reminderType": "weekly-plan"
}
```

`reminderType` supportati:
- `meal-plan`
- `shopping`
- `weekly-plan`

## 6) Test rapido
Attiva notifiche dalla PWA, poi:

```bash
curl -X POST "https://<tuo-dominio>/api/push/send-test" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","title":"Test Push","body":"Prima push end-to-end","url":"/"}'
```

## 7) Note iPhone
- Web Push iOS funziona solo da PWA installata (`Aggiungi a Home` in Safari).
- La PWA deve avere notifiche abilitate in iOS Settings.
- Se permesso `denied`, va riabilitato manualmente.
