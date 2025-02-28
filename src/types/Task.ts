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
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  updatedAt: string;
}

export interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
}
