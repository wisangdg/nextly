import React, { createContext, useContext, useState } from "react";
import { Task } from "../types/Task"; // Updated casing

interface ModalContextType {
  isTaskEditModalOpen: boolean;
  taskToEdit: Task | null;
  openTaskEditModal: (task: Task) => void;
  closeTaskEditModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const openTaskEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskEditModalOpen(true);
  };

  const closeTaskEditModal = () => {
    setIsTaskEditModalOpen(false);
    setTaskToEdit(null);
  };

  return (
    <ModalContext.Provider
      value={{
        isTaskEditModalOpen,
        taskToEdit,
        openTaskEditModal,
        closeTaskEditModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
