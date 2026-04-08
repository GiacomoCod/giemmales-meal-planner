# Push Notifications MVP (Web + PWA)

## 1) Setup Firebase Cloud Messaging
- Vai su Firebase Console > `meal-planner-vibe` > Cloud Messaging.
- Nella sezione Web Push genera/importa il certificato e copia la chiave pubblica VAPID.
- Crea `.env.local` da `.env.example` e imposta:

```bash
VITE_FIREBASE_VAPID_KEY=YOUR_REAL_VAPID_PUBLIC_KEY
```

## 2) Cosa è già stato implementato
- Service worker FCM: `public/firebase-messaging-sw.js`
- Gestione subscribe/unsubscribe + persistenza token Firestore: `src/pushNotifications.ts`
- UI utente in Impostazioni > `Notifiche Push`: `src/components/SettingsSection.tsx`

## 3) Struttura dati Firestore (MVP)
- Collezione:
  - profilo principale: `pushSubscriptions`
  - altri profili: `profiles/{profileId}/pushSubscriptions`
- Documento id: `encodeURIComponent(token)`
- Campi:
  - `token`, `userId`, `profileId`, `enabled`, `permission`
  - `userAgent`, `language`, `platform`, `updatedAt`

## 4) Endpoint server consigliato per invio push
Per inviare notifiche reali serve un endpoint server-side (Netlify Function o Firebase Function) che:
- valida l'utente/chiamata (auth)
- legge i token attivi da Firestore
- invia tramite Firebase Admin SDK
- marca come invalidi i token scaduti/non validi

In questo progetto è stato aggiunto:
- Function: `netlify/functions/push-send-test.js`
- Endpoint pubblico: `POST /api/push/send-test` (redirect verso `/.netlify/functions/push-send-test`)

Body JSON esempio:
```json
{
  "profileId": "giemmale",
  "title": "Test",
  "body": "Push ok",
  "url": "/?tab=planner"
}
```

Header auth opzionale ma consigliato:
- `x-api-key: <PUSH_TEST_API_KEY>`

Variabili ambiente server da configurare su Netlify:
- `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON completo service account Firebase Admin, serializzato su singola riga)
- `PUSH_TEST_API_KEY` (se impostata, la function richiede questa key)

## 5) Flusso test suggerito
1. Avvia app in HTTPS (deploy preview/prod).
2. Login e apri `Impostazioni > Notifiche Push`.
3. Attiva notifiche e concedi il permesso browser.
4. Verifica creazione documento in Firestore.
5. Chiama endpoint server `send-test` e verifica ricezione su PWA.

Esempio `curl`:
```bash
curl -X POST "https://<tuo-dominio>/api/push/send-test" \
  -H "content-type: application/json" \
  -H "x-api-key: <PUSH_TEST_API_KEY>" \
  -d '{"profileId":"giemmale","title":"Test Push","body":"Prima push end-to-end","url":"/"}'
```

## 6) Note importanti
- iOS supporta Web Push solo da PWA installata su Home Screen.
- Se permesso è `denied`, va riabilitato manualmente dalle impostazioni browser.
- Le notifiche sono per dispositivo/browser: ogni device richiede attivazione separata.
