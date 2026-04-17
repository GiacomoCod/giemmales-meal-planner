/**
 * Web Worker per calcoli date calendario
 * Esegue in un thread separato per non bloccare la UI
 */

/**
 * Genera array di giorni per il calendario mensile
 * Ottimizzato per evitare creazioni multiple di Date objects
 */
const generateCalendarDays = (
  year: number,
  month: number, // 0-11
  weekStartsOn: 0 | 1 = 1 // 0 = Sunday, 1 = Monday
): Date[] => {
  const days: Date[] = [];
  
  // Primo giorno del mese
  const firstDay = new Date(year, month, 1);
  
  // Giorno della settimana del primo giorno (0 = Domenica, 1 = Lunedì, ...)
  const firstDayOfWeek = firstDay.getDay();
  
  // Calcola offset per iniziare dalla settimana corretta
  let startDate: Date;
  if (weekStartsOn === 1) {
    // Inizia da Lunedì
    const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate = new Date(year, month, 1 - daysFromMonday);
  } else {
    // Inizia da Domenica
    startDate = new Date(year, month, 1 - firstDayOfWeek);
  }
  
  // Calcola numero di giorni da generare (6 settimane per coprire tutti i casi)
  const totalDays = 42;
  
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  
  return days;
};

/**
 * Calcola inizio e fine settimana per una data
 */
const getWeekBounds = (date: Date, weekStartsOn: 0 | 1 = 1): { start: Date; end: Date } => {
  const day = date.getDay();
  const diff = date.getDate() - day + (weekStartsOn === 1 && day === 0 ? -6 : weekStartsOn);
  
  const start = new Date(date);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Calcola inizio e fine mese
 */
const getMonthBounds = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Handler messaggi dal thread principale
 */
self.onmessage = (event: MessageEvent<{
  method: string;
  params: any[];
  jobId: string;
}>) => {
  const { method, params, jobId } = event.data;

  try {
    let result: any;

    switch (method) {
      case 'generateCalendarDays':
        result = generateCalendarDays(params[0], params[1], params[2]);
        break;
      
      case 'getWeekBounds':
        result = getWeekBounds(params[0], params[1]);
        break;
      
      case 'getMonthBounds':
        result = getMonthBounds(params[0], params[1]);
        break;
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    self.postMessage({
      type: 'result',
      data: result,
      jobId
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId
    });
  }
};

export default null as unknown as Worker;
