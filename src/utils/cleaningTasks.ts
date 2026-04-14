import { addDays, format, parseISO } from 'date-fns';
import type { CleaningLog, RoomTask, TaskSettings } from '../types';

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const sanitizeTaskName = (taskName: string) => normalizeWhitespace(taskName);

export const normalizeTaskName = (taskName: string) =>
  sanitizeTaskName(taskName).toLocaleLowerCase('it-IT');

export const buildRoomTaskKey = (roomId: string, taskName: string) =>
  `${roomId}::${normalizeTaskName(taskName)}`;

export const hasRoomTask = (tasks: RoomTask[], roomId: string, taskName: string) => {
  const targetKey = buildRoomTaskKey(roomId, taskName);
  return tasks.some((task) => buildRoomTaskKey(task.roomId, task.taskName) === targetKey);
};

export const dedupeRoomTasks = (tasks: RoomTask[]) => {
  const uniqueTasks = new Map<string, RoomTask>();

  [...tasks]
    .sort((a, b) => {
      const createdAtDelta = (a.createdAt || 0) - (b.createdAt || 0);
      if (createdAtDelta !== 0) return createdAtDelta;

      const nameDelta = a.taskName.localeCompare(b.taskName, 'it');
      if (nameDelta !== 0) return nameDelta;

      return a.id.localeCompare(b.id);
    })
    .forEach((task) => {
      const key = buildRoomTaskKey(task.roomId, task.taskName);
      if (!uniqueTasks.has(key)) {
        uniqueTasks.set(key, task);
      }
    });

  return [...uniqueTasks.values()];
};

export const sortCleaningLogs = (logs: CleaningLog[]) =>
  [...logs].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    if (dateOrder !== 0) return dateOrder;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

export const getLatestCleaningLog = (
  cleaningLogs: CleaningLog[],
  roomId: string,
  taskName: string
) =>
  sortCleaningLogs(
    cleaningLogs.filter(
      (log) => buildRoomTaskKey(log.roomId, log.taskType) === buildRoomTaskKey(roomId, taskName)
    )
  )[0] || null;

export const getTaskIntervalDays = (taskSettings: TaskSettings, taskName: string) => {
  const settings =
    taskSettings[taskName] ||
    Object.entries(taskSettings).find(([currentTaskName]) => normalizeTaskName(currentTaskName) === normalizeTaskName(taskName))?.[1] ||
    { value: 1, unit: 'settimane' };

  if (settings.unit === 'giorni') return settings.value;
  if (settings.unit === 'mesi') return settings.value * 30;
  if (settings.unit === 'anni') return settings.value * 365;
  return settings.value * 7;
};

export const getNextCleaningDate = (
  task: Pick<RoomTask, 'roomId' | 'taskName'>,
  cleaningLogs: CleaningLog[],
  taskSettings: TaskSettings
) => {
  const latestLog = getLatestCleaningLog(cleaningLogs, task.roomId, task.taskName);
  if (!latestLog?.date) return null;

  const latestLogDate = parseISO(latestLog.date);
  if (Number.isNaN(latestLogDate.getTime())) return null;

  const totalDays = getTaskIntervalDays(taskSettings, task.taskName);
  return format(addDays(latestLogDate, totalDays), 'yyyy-MM-dd');
};
