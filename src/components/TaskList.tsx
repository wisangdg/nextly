import React, { useState } from "react";
import { useTaskContext } from "../context/TaskContext";
import { Task, TaskStatus } from "../types/Task"; // Updated casing
import { TaskItem } from "./TaskItem";
import { useModal } from "../context/ModalContext";

export const TaskList: React.FC = () => {
  const { tasks } = useTaskContext();
  const { openTaskEditModal } = useModal();
  const [filter, setFilter] = useState({
    status: "all",
    category: "all",
    priority: "all",
    search: "",
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      filter.status === "all" ||
      (filter.status === "completed" && task.status === TaskStatus.Completed) ||
      (filter.status === "active" && task.status === TaskStatus.Active);

    const matchesCategory =
      filter.category === "all" || task.category === filter.category;

    const matchesPriority =
      filter.priority === "all" || task.priority === filter.priority;

    const matchesSearch =
      filter.search === "" ||
      task.title.toLowerCase().includes(filter.search.toLowerCase()) ||
      task.description.toLowerCase().includes(filter.search.toLowerCase());

    return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
  });

  const handleEditTask = (task: Task) => {
    openTaskEditModal(task);
  };

  if (!tasks || tasks.length === 0) {
    return <div>No tasks available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="status"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>
            <select
              id="status"
              value={filter.status}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, status: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <select
              id="category"
              value={filter.category}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, category: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              {["work", "personal", "shopping", "health", "other"].map(
                (category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Priority
            </label>
            <select
              id="priority"
              value={filter.priority}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="all">All</option>
              {["low", "medium", "high"].map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label
              htmlFor="search"
              className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              value={filter.search}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, search: e.target.value }))
              }
              className="mt-1 block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="Search tasks..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tasks found</div>
        ) : (
          filteredTasks.map((task) => (
            <TaskItem key={task.id} task={task} onEdit={handleEditTask} />
          ))
        )}
      </div>
    </div>
  );
};
