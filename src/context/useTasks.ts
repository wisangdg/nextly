import { useContext } from "react";
import { TaskContext } from "./taskContextDef.ts";

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
};

// Backwards compatibility alias
export const useTaskContext = useTasks;
