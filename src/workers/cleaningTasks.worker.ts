/**
 * Web Worker per calcoli pesanti su cleaning tasks
 * Esegue in un thread separato per non bloccare la UI
 */

// Importa le funzioni originali (saranno eseguite nel worker)
const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const sanitizeTaskName = (taskName: string) => normalizeWhitespace(taskName);

const normalizeTaskName = (taskName: string) =>
  sanitizeTaskName(taskName).toLocaleLowerCase('it-IT');

const buildRoomTaskKey = (roomId: string, taskName: string) =>
  `${roomId}::${normalizeTaskName(taskName)}`;

/**
 * Deduplica room tasks mantenendo il primo per ogni chiave
 * Ottimizzato con Map invece di array operations
 */
const dedupeRoomTasks = (tasks: Array<{
  id: string;
  roomId: string;
  taskName: string;
  createdAt?: number;
  [key: string]: any;
}>) => {
  const uniqueTasks = new Map<string, typeof tasks[0]>();

  // Sort una tantum invece di multiple iterazioni
  const sorted = [...tasks].sort((a, b) => {
    const createdAtDelta = (a.createdAt || 0) - (b.createdAt || 0);
    if (createdAtDelta !== 0) return createdAtDelta;
    return a.taskName.localeCompare(b.taskName, 'it');
  });

  for (const task of sorted) {
    const key = buildRoomTaskKey(task.roomId, task.taskName);
    if (!uniqueTasks.has(key)) {
      uniqueTasks.set(key, task);
    }
  }

  return [...uniqueTasks.values()];
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
      case 'dedupeRoomTasks':
        result = dedupeRoomTasks(params[0]);
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
