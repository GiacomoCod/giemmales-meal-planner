import { useCallback, useEffect } from 'react';
import { useWorker } from '../hooks/useWorker';

/**
 * Hook per calcoli calendario tramite Web Worker
 * Non blocca il thread principale durante la generazione dei giorni
 */
export function useCalendarWorker() {
  const { initWorker, execute, terminate, isReady } = useWorker<Worker>();

  // Inizializza il worker
  useEffect(() => {
    const workerFactory = () => new Worker(
      new URL('../workers/calendar.worker.ts', import.meta.url),
      { type: 'module' }
    );
    initWorker(workerFactory);
  }, [initWorker]);

  // Genera giorni calendario
  const generateCalendarDays = useCallback(async (
    year: number,
    month: number, // 0-11
    weekStartsOn: 0 | 1 = 1
  ): Promise<Date[]> => {
    if (!isReady) {
      // Fallback sincrono se worker non pronto
      const days: Date[] = [];
      const firstDay = new Date(year, month, 1);
      const firstDayOfWeek = firstDay.getDay();
      
      let startDate: Date;
      if (weekStartsOn === 1) {
        const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        startDate = new Date(year, month, 1 - daysFromMonday);
      } else {
        startDate = new Date(year, month, 1 - firstDayOfWeek);
      }
      
      for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
      
      return days;
    }

    return execute<Date[]>('generateCalendarDays', [year, month, weekStartsOn]);
  }, [execute, isReady]);

  // Calcola bounds settimana
  const getWeekBounds = useCallback(async (date: Date, weekStartsOn: 0 | 1 = 1): Promise<{ start: Date; end: Date }> => {
    if (!isReady) {
      // Fallback sincrono
      const day = date.getDay();
      const diff = date.getDate() - day + (weekStartsOn === 1 && day === 0 ? -6 : weekStartsOn);
      const start = new Date(date);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return execute<{ start: Date; end: Date }>('getWeekBounds', [date, weekStartsOn]);
  }, [execute, isReady]);

  // Calcola bounds mese
  const getMonthBounds = useCallback(async (year: number, month: number): Promise<{ start: Date; end: Date }> => {
    if (!isReady) {
      // Fallback sincrono
      const start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return execute<{ start: Date; end: Date }>('getMonthBounds', [year, month]);
  }, [execute, isReady]);

  return {
    generateCalendarDays,
    getWeekBounds,
    getMonthBounds,
    isReady,
    terminate
  };
}
