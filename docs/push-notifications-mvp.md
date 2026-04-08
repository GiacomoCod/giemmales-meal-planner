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
- `netlify/functions/push-send-cleaning-due.cjs`
- `netlify/functions/push-send-events-due.cjs`
- `netlify/functions/push-send-shopping-reminder.cjs`
- `netlify/functions/push-send-weekly-menu-reminder.cjs`
- `netlify/functions/push-schedule-events-due.cjs` (invio automatico schedulato)
- `netlify/functions/push-schedule-cleaning-due.cjs` (invio automatico mansioni)
- `netlify/functions/push-schedule-shopping-reminder.cjs`
- `netlify/functions/push-schedule-weekly-menu-reminder.cjs`
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
- `PUSH_EVENTS_DUE_PROFILE_IDS=giemmale` (lista profili separati da virgola)
- `PUSH_EVENTS_DUE_TIME_ZONE=Europe/Rome`
- `PUSH_EVENTS_DUE_HOUR_TOMORROW_LOCAL=20` (eventi domani)
- `PUSH_EVENTS_DUE_HOUR_TODAY_LOCAL=10` (eventi oggi)
- `PUSH_CLEANING_DUE_PROFILE_IDS=giemmale` (opzionale, fallback su `PUSH_EVENTS_DUE_PROFILE_IDS`)
- `PUSH_CLEANING_DUE_TIME_ZONE=Europe/Rome`
- `PUSH_CLEANING_DUE_HOUR_TOMORROW_LOCAL=20` (mansioni domani)
- `PUSH_CLEANING_DUE_HOUR_TODAY_LOCAL=10` (mansioni oggi)
- `PUSH_SHOPPING_REMINDER_PROFILE_IDS=giemmale` (opzionale, fallback su `PUSH_EVENTS_DUE_PROFILE_IDS`)
- `PUSH_SHOPPING_REMINDER_TIME_ZONE=Europe/Rome`
- `PUSH_SHOPPING_REMINDER_HOUR_LOCAL=17`
- `PUSH_SHOPPING_REMINDER_DAYS=Tue,Fri`
- `PUSH_WEEKLY_MENU_REMINDER_PROFILE_IDS=giemmale` (opzionale, fallback su `PUSH_EVENTS_DUE_PROFILE_IDS`)
- `PUSH_WEEKLY_MENU_REMINDER_TIME_ZONE=Europe/Rome`
- `PUSH_WEEKLY_MENU_REMINDER_HOUR_LOCAL=20`
- `PUSH_WEEKLY_MENU_REMINDER_DAY=Sun`

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

Doc `profiles/{profileId}/metadata/settings` (preferenze push):
- `pushNotificationPreferences.events` (boolean)
- `pushNotificationPreferences.cleaning` (boolean)
- `pushNotificationPreferences.shopping` (boolean)
- `pushNotificationPreferences.weeklyMenu` (boolean)

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

`POST /api/push/send-cleaning-due`
- invia promemoria mansioni in scadenza (default: domani, timezone Europe/Rome)
- body minimo:
```json
{
  "profileId": "giemmale"
}
```
- opzionali:
  - `timeZone` (es. `Europe/Rome`)
  - `targetDate` (formato `yyyy-MM-dd`, override manuale)
  - `ignoreDailyLimit` (boolean, default `false`, bypass anti-spam)

`POST /api/push/send-events-due`
- invia promemoria eventi previsti (default: domani, timezone Europe/Rome)
- body minimo:
```json
{
  "profileId": "giemmale"
}
```
- opzionali:
  - `timeZone` (es. `Europe/Rome`)
  - `targetDate` (formato `yyyy-MM-dd`, override manuale)
  - `ignoreDailyLimit` (boolean, default `false`, bypass anti-spam)

`POST /api/push/send-shopping-reminder`
- invia reminder spesa se esistono elementi non completati in lista
- body minimo:
```json
{
  "profileId": "giemmale"
}
```
- opzionali:
  - `timeZone` (es. `Europe/Rome`)
  - `ignoreDailyLimit` (boolean, default `false`, bypass anti-spam)

`POST /api/push/send-weekly-menu-reminder`
- invia reminder pianificazione menu settimanale
- body minimo:
```json
{
  "profileId": "giemmale"
}
```
- opzionali:
  - `timeZone` (es. `Europe/Rome`)
  - `ignoreDailyLimit` (boolean, default `false`, bypass anti-spam)

## 6) Test rapido
Attiva notifiche dalla PWA, poi:

```bash
curl -X POST "https://<tuo-dominio>/api/push/send-test" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","title":"Test Push","body":"Prima push end-to-end","url":"/"}'
```

Esempio mansioni in scadenza:
```bash
curl -X POST "https://<tuo-dominio>/api/push/send-cleaning-due" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","timeZone":"Europe/Rome"}'
```

Esempio eventi previsti domani:
```bash
curl -X POST "https://<tuo-dominio>/api/push/send-events-due" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","timeZone":"Europe/Rome"}'
```

Esempio reminder spesa:
```bash
curl -X POST "https://<tuo-dominio>/api/push/send-shopping-reminder" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","timeZone":"Europe/Rome"}'
```

Esempio reminder menu settimanale:
```bash
curl -X POST "https://<tuo-dominio>/api/push/send-weekly-menu-reminder" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","timeZone":"Europe/Rome"}'
```

### Anti-spam pulizie
- Regola: massimo 1 reminder al giorno per singola mansione.
- Se l'endpoint viene chiamato più volte nella stessa giornata, le mansioni già notificate vengono saltate.
- La risposta include `skippedTasks` con quelle bloccate dall'anti-spam.

### Anti-spam eventi
- Regola: massimo 1 reminder al giorno per singolo evento.
- Se l'endpoint viene chiamato più volte nella stessa giornata, gli eventi già notificati vengono saltati.
- La risposta include `skippedEvents` con quelli bloccati dall'anti-spam.

### Anti-spam spesa e menu settimanale
- Regola: massimo 1 reminder al giorno per tipo (`shopping-reminder`, `weekly-menu-reminder`).
- Se l'endpoint viene richiamato più volte nella stessa giornata, il reminder successivo viene bloccato.

## 7) Invio automatico (senza POST manuale)
- Sono attive 4 Scheduled Function Netlify (`@hourly`):
  - `push-schedule-events-due`
  - `push-schedule-cleaning-due`
  - `push-schedule-shopping-reminder`
  - `push-schedule-weekly-menu-reminder`
- `push-schedule-events-due` e `push-schedule-cleaning-due` aprono due finestre:
  - reminder del giorno dopo (default: `20:00`)
  - reminder del giorno stesso (default: `10:00`)
- Nel reminder eventi delle 10:00, gli eventi con orario già passato vengono esclusi automaticamente.
- Reminder spesa: martedì e venerdì alle 17:00 (default).
- Reminder menu settimanale: domenica alle 20:00 (default).
- Il gating orario locale evita shift con ora legale/solare.
- La POST `/api/push/send-events-due` resta utile solo per test manuali/debug.
- La POST `/api/push/send-cleaning-due` resta utile solo per test manuali/debug.
- La POST `/api/push/send-shopping-reminder` resta utile solo per test manuali/debug.
- La POST `/api/push/send-weekly-menu-reminder` resta utile solo per test manuali/debug.

## 8) Preferenze Utente
- Nella sezione `Impostazioni > Notifiche Push` l'utente può abilitare/disabilitare per categoria:
  - Eventi calendario
  - Mansioni pulizie
  - Lista spesa
  - Menu settimanale
- Le scheduled functions e gli endpoint server rispettano sempre queste preferenze.

## 9) Note iPhone
- Web Push iOS funziona solo da PWA installata (`Aggiungi a Home` in Safari).
- La PWA deve avere notifiche abilitate in iOS Settings.
- Se permesso `denied`, va riabilitato manualmente.

## 10) In-App Notification Center
- Ogni invio push via endpoint server (`send-test`, `send-reminder`, `send-cleaning-due`, `send-events-due`, `send-shopping-reminder`, `send-weekly-menu-reminder`) salva anche una notifica in Firestore nella collezione `notifications`.
- Queste notifiche sono quindi visibili sia su lock screen/device sia nel centro notifiche interno all'app.
