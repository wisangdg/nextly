export type Priority = "low" | "medium" | "high";

export type Category = "work" | "personal" | "shopping" | "health" | "other";

export enum TaskStatus {
  Active = "active",
  Completed = "completed",
}

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
}
