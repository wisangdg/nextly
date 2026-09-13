import { createContext } from "react";
import type { Task } from "../types/Task.ts";

export type ModalMode = "create" | "edit";

export interface ModalContextType {
  isTaskModalOpen: boolean;
  modalMode: ModalMode;
  taskToEdit: Task | null;
  initialTitle: string;
  openTaskEditModal: (task: Task) => void;
  openTaskCreateModal: (initialTitle?: string) => void;
  closeTaskModal: () => void;
  // Backwards compatibility
  isTaskEditModalOpen: boolean;
  closeTaskEditModal: () => void;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);
