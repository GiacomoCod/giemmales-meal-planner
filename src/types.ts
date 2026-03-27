export type MealEntry = {
  id: string;
  text: string;
  assignee: 'Ale' | 'Giem' | 'Giemmale';
};

export type MealPlan = {
  [dateKey: string]: {
    [mealId: string]: MealEntry[];
  };
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  ingredients?: string[];
  steps?: string[];
};

export type CleaningLog = {
  id: string;
  roomId: string;
  taskType: string;
  date: string; // yyyy-MM-dd
  timestamp: number;
};

export type RoomTask = {
  id: string;
  roomId: string;
  taskName: string;
  createdAt: number;
};

export type TaskUnit = 'giorni' | 'settimane' | 'mesi' | 'anni';

export type TaskSettings = {
  [taskType: string]: {
    value: number;
    unit: TaskUnit;
  };
};

export type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
};

export interface NotificationItem {
  id: string;
  text: string;
  timestamp: number;
  read: boolean;
}
