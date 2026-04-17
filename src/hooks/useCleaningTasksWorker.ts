import { useCallback, useEffect } from 'react';
import { useWorker } from '../hooks/useWorker';

/**
 * Hook per calcoli su cleaning tasks tramite Web Worker
 * Non blocca il thread principale durante la deduplicazione
 */
export function useCleaningTasksWorker() {
  const { initWorker, execute, terminate, isReady } = useWorker<Worker>();

  // Inizializza il worker
  useEffect(() => {
    const workerFactory = () => new Worker(
      new URL('../workers/cleaningTasks.worker.ts', import.meta.url),
      { type: 'module' }
    );
    initWorker(workerFactory);
  }, [initWorker]);

  // Deduplica room tasks
  const dedupeRoomTasks = useCallback(async <T extends {
    id: string;
    roomId: string;
    taskName: string;
    createdAt?: number;
  }>(tasks: T[]): Promise<T[]> => {
    if (!isReady) {
      // Fallback sincrono se worker non pronto
      const normalizeTaskName = (taskName: string) =>
        taskName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT');
      
      const buildRoomTaskKey = (roomId: string, taskName: string) =>
        `${roomId}::${normalizeTaskName(taskName)}`;
      
      const uniqueTasks = new Map<string, T>();
      [...tasks]
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .forEach((task) => {
          const key = buildRoomTaskKey(task.roomId, task.taskName);
          if (!uniqueTasks.has(key)) {
            uniqueTasks.set(key, task);
          }
        });
      return [...uniqueTasks.values()];
    }

    return execute<T[]>('dedupeRoomTasks', [tasks]);
  }, [execute, isReady]);

  return {
    dedupeRoomTasks,
    isReady,
    terminate
  };
}
