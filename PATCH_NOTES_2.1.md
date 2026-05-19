# Patch Notes: Meal Planner v2.1
**8 Aprile 2026**

### 🔔 Notifiche Push
- **Notifiche**: sono arrivate le notifiche! Attiva le notifiche nelle impostazioni dell'app e consenti i permessi per ricevere notifiche sui tuoi eventi, mansioni delle puizie, spesa della settimana e menù.
- **Web Push standard**: notifiche ora compatibili anche con iPhone tramite PWA installata.
- **Preferenze per categoria**: in Impostazioni puoi attivare o disattivare le notifiche push per singola categoria: Eventi, Pulizie, Spesa e Menu settimanale. Spunta ciò che non vuoi ti rompa le scatole.
- **Reminder automatici**: eventi e pulizie vengono notificati sia il giorno prima sia il giorno stesso.
- **Nuovi promemoria**: aggiunti reminder dedicati per lista spesa e pianificazione del menu settimanale.
- **Centro notifiche interno**: ogni push viene salvata anche dentro l'app.

### ⚡ Affidabilita'
- **Consegna iOS piu' stabile**: unificati service worker e gestione attivazione per ridurre i problemi di ricezione.
- **Subscription corrette**: salvataggio chiavi e formato push allineati allo standard Web Push.
- **Meno rumore**: introdotto un limite anti-spam giornaliero per evitare duplicati.
- **Reminder piu' precisi**: i promemoria delle 10:00 ignorano gli eventi con orario gia' passato.

### 🛠️ Supporto Tecnico
- **Scheduler automatici**: nuove funzioni pianificate per invii ricorrenti senza interventi manuali.
- **Debug migliorato**: endpoint e diagnostica piu' dettagliati per verificare invio e sottoscrizioni.
- **Deploy piu' robusto**: aggiornate le funzioni Netlify per una pipeline push piu' affidabile.
