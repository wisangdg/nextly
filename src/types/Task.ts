export type Priority = "low" | "medium" | "high";

export type Category = "work" | "personal" | "shopping" | "health" | "other";

export const TaskStatus = {
  Active: "active",
  Completed: "completed",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  updatedAt: string;
  completedAt?: string;
}

export type TaskCreateInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">;

export type TaskUpdateInput = Partial<Omit<Task, "id" | "createdAt" | "dueDate">> & {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: Priority;
  category?: Category;
  status?: TaskStatus;
  completedAt?: string;
};

export interface StoragePayload {
  version: number;
  tasks: Task[];
  exportedAt?: string;
}
