# 📝 Patch Notes: Meal Planner v2.0
**7 Aprile 2026**

> [!WARNING]
> **NOTA IMPORTANTE**: La modalità Dark Mode è attualmente in fase di sviluppo sperimentale. Si consiglia di non utilizzarla fino a nuova comunicazione per evitare problemi di visualizzazione.

### 🏷️ Sistema Tag e Assegnatari
- **Multi-assegnazione**: Possibilità di assegnare più persone ad un singolo pasto nel Planner.
- **Gestore Tag**: Nuova interfaccia per aggiungere/eliminare tag e personalizzare i colori da una palette predefinita.
- **Badge**: Visualizzazione dei nomi assegnati tramite badge colorati in tutte le sezioni.

### 📱 Navigazione Mobile
- **Swipe gesture**: Trascinamento verso il basso per chiudere i menu a comparsa (bottom sheets).
- **Header**: Standardizzazione delle intestazioni con icone, titoli e sottotitoli coerenti in ogni sezione.
- **Layout**: Ottimizzazione di spazi verticali e margini per dispositivi mobile.

### 🎨 Design e UI
- **Dark Mode**: Correzione di contrasto, bordi e hover (fase sperimentale - non consigliata).
- **InfoTooltips**: Aggiunta di icone informative per spiegare le funzionalità principali.
- **Animazioni**: Transizioni regolate tra le diverse visualizzazioni della dashboard.

### 🏠 Modifiche per Sezione
- **Planner**: Pulsante rapido per la gestione dei tag inserito nella vista settimanale.
- **Ricette**: Migliorata la leggibilità delle etichette degli autori e dei filtri.
- **Pulizie**: Allineamento verticale dei box corretto per le visualizzazioni desktop.
- **Spesa**: Struttura a 3 colonne (Supermercato, Casa, Farmacia) e pulsanti categorie ottimizzati.
- **Finanze**: Risolto il bug nel caricamento asincrono dei tag che bloccava l'inserimento delle spese.

### ⚙️ Aspetti Tecnici
- **Hook `useSwipeToDismiss`**: Logica centralizzata per la gestione delle gesture touch di chiusura.
- **Dati**: Migrazione automatica dal campo `assignee` (stringa) ad array `assignees`.
- **Build**: Configurazione Vite/Netlify aggiornata per prevenire errori nelle dipendenze (legacy-peer-deps).
