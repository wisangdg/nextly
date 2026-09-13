import React, { useState } from "react";
import type { Task } from "../types/Task.ts";
import { ModalMode, ModalContext } from "./modalContextDef.ts";

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("edit");
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [initialTitle, setInitialTitle] = useState("");

  const openTaskEditModal = (task: Task) => {
    setTaskToEdit(task);
    setModalMode("edit");
    setInitialTitle("");
    setIsTaskModalOpen(true);
  };

  const openTaskCreateModal = (title = "") => {
    setTaskToEdit(null);
    setModalMode("create");
    setInitialTitle(title);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
    setInitialTitle("");
  };

  return (
    <ModalContext.Provider
      value={{
        isTaskModalOpen,
        modalMode,
        taskToEdit,
        initialTitle,
        openTaskEditModal,
        openTaskCreateModal,
        closeTaskModal,
        isTaskEditModalOpen: isTaskModalOpen,
        closeTaskEditModal: closeTaskModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
