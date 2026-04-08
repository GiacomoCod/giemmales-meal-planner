export type Tag = {
  id: string;
  label: string;
  color: string;
};

export type MealEntry = {
  id: string;
  text: string;
  assignee: string; // legacy backward-compat
  assignees?: string[]; // new multi-tag
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
  authorId?: string;
};

export type CleaningLog = {
  id: string;
  roomId: string;
  taskType: string;
  date: string; // yyyy-MM-dd
  timestamp: number;
  performedByTagId?: string;
  performedByLabel?: string;
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
  category: 'supermarket' | 'home' | 'medicine';
};

export interface NotificationItem {
  id: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export type CalendarEvent = {
  id: string;
  text: string;
  date: string; // yyyy-MM-dd
  startTime?: string;
  endTime?: string;
  color?: string;
};

export type ExpenseCategory = 'supermarket' | 'home' | 'medicine' | 'repayment' | 'other';

export type Expense = {
  id: string;
  amount: number;           // importo in €
  description: string;      // descrizione libera
  category: ExpenseCategory;
  date: string;             // yyyy-MM-dd
  timestamp: number;
  paidBy: string;           // id del tag persona (es. 'ale', 'giem')
  splitWith?: string[];     // id dei tag persone con cui dividere (se vuoto o assente, divisa con tutti)
};
