import React, { createContext, useContext, useState, useEffect } from "react";
import { Task, TaskStatus } from "../types/Task"; // Updated casing
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;
  toggleTaskCompletion: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // Convert string dates back to Date objects
        return parsedTasks.map((task: Task) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        }));
      } catch (e) {
        console.error("Failed to parse tasks from localStorage", e);
        return [];
      }
    }
    return [];
  });

  // Save tasks to localStorage when they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString(); // Convert to ISO string
    const newTask: Task = {
      id: uuidv4(),
      ...taskData,
      createdAt: now,
      updatedAt: now,
      status: TaskStatus.Active,
    };

    setTasks((prevTasks) => [...prevTasks, newTask]);
    toast.success("Task added successfully!");
  };

  const updateTask = (id: string, taskData: Partial<Task>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? { ...task, ...taskData, updatedAt: new Date().toISOString() }
          : task
      )
    );
    toast.success("Task updated!");
  };

  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    toast.success("Task deleted!");
  };

  const getTask = (id: string) => {
    return tasks.find((task) => task.id === id);
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status:
                task.status === TaskStatus.Completed
                  ? TaskStatus.Active
                  : TaskStatus.Completed,
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    );
    const task = tasks.find((t) => t.id === id);
    const isCompleting = task?.status !== TaskStatus.Completed;
    toast.success(
      isCompleting ? "Task completed!" : "Task marked as incomplete"
    );
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        getTask,
        toggleTaskCompletion,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

// Create and export the useTasks hook
export const useTasks = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
};

// Export the same hook as useTaskContext for backwards compatibility
export const useTaskContext = useTasks;
