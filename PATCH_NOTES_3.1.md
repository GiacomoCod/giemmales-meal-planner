# Patch Notes: Meal Planner v3.1
**18 Aprile 2026**

## AVVISO IMPORTANTE
- Abbiamo effettuato una migrazione del sito che ora troverete al link: "https://vibes-planning.netlify.app", ogni altro link darà un errore di caricamento. 
- Se avete istallato le vostre app PWA su mobile consiglio di eliminarle e reistallarle da capo. 

## GUIDA ALL'ISTALLAZIONE
- **IOS🍏**: Aprire il link sopra riportato con il browser Safari, effettuare il login. Cliccare sui tre puntini (...) in basso a destra -> Condividi -> scorrere in basso e selezionare '✚ aggiungi alla schermata home' -> Aggiungi. Una volta aggiunta entrare nell'app e effettuare nuovamente il login. 
- **Android👾**: Aprire il link sopra riportato con il browser Chrome: se il browser vi propone subito la possibilità di istallare l'app (tramite pop-up) cliccare su istalla, altrimenti cliccare i 3 puntini in alto a destra -> Aggiungi alla schermata home -> istalla. Attendere l'istallazione, aprire l'app ed effettuare nuovamente il login

## NOTA 
- **Notifiche push** Dopo la reistallazione, recarsi nella sezione Impostazioni -> Notifiche Push -> Spuntare 'notifiche disattivate' e fornire i permessi di sistema al sito. 

## PATCH NOTES 
### 🚀 Performance & Fluidità
- **Caricamento più veloce**: ottimizzato il caricamento delle sezioni (chunk separati + preload intelligente) per rendere l’app più reattiva, soprattutto su mobile.
- **Meno scatti e più smooth**: introdotti caching e tecniche di virtualizzazione nelle liste più pesanti per migliorare performance e ridurre lag.
- **Ottimizzazioni iOS/Safari**: migliorata la gestione cache e alcune accortezze specifiche per rendere l’esperienza più stabile nel tempo.

### 👆 Swipe & Navigazione Mobile (molto migliorati)
- **Swipe orizzontale più affidabile**: riconoscimento migliore tra scroll verticale e swipe orizzontale, con meno “gesture sbagliate”.
- **Android fix**: risolti problemi di scroll verticale e irrigidita la gestione delle gesture nel pager mobile.
- **Transizioni più intelligenti**: saltare tra schede lontane evita animazioni “infinite” e rende il cambio sezione più naturale.

### 🧭 Interfaccia Mobile più Pulita
- **Nuova bottom navbar**: interfaccia più leggibile e stabile; le sezioni extra finiscono in un pannello “Altro” più comodo.
- **Pulsanti flottanti (FAB) sistemati**: posizionamento più consistente grazie a un refactor con Portals (addio bottoni che “ballano”).
- **UI rifinita**: miglioramenti estetici e di spaziatura per rendere tutto più godibile da smartphone.

### 🔀 Personalizzazione: Ordine e Visibilità Sezioni
- **Ordine sezioni mobile personalizzabile**: nelle impostazioni puoi cambiare l’ordine di visualizzazione delle sezioni.
- **Coerenza totale**: l’ordine scelto viene usato sia nella navbar mobile sia nello swipe orizzontale tra le schermate.
- **Sezioni visibili**: puoi anche nascondere/mostrare sezioni senza perdere l’ordine impostato.

### 🌙 Impostazioni & Qualità della Vita
- **Dark Mode**: nuova modalità scura attivabile dalle impostazioni.
- **Home più utile**: agenda della casa più “rapida” su mobile (vista compatta/espandibile) e creazione eventi con controlli migliori (anche ora fine).

