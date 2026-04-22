import React from "react";
import { useTasks } from "../context/TaskContext";
import { motion } from "framer-motion";
import { TaskStatus } from "../types/Task";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export const Dashboard: React.FC = () => {
  const { tasks } = useTasks();

  const stats = {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === TaskStatus.Completed)
      .length,
    incomplete: tasks.filter((task) => task.status === TaskStatus.Active)
      .length,
    highPriority: tasks.filter((task) => task.priority === "high").length,
  };

  // Calculate completion rate percentage
  const completionRate =
    tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          icon={<ChartBarIcon className="h-6 w-6" />}
          className="bg-gradient-to-br from-primary-700 to-primary-900"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          className="bg-gradient-to-br from-green-700 to-green-900"
        />
        <StatCard
          title="In Progress"
          value={stats.incomplete}
          icon={<ClockIcon className="h-6 w-6" />}
          className="bg-gradient-to-br from-amber-600 to-amber-800"
        />
        <StatCard
          title="High Priority"
          value={stats.highPriority}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          className="bg-gradient-to-br from-red-700 to-red-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Completion Rate
          </h2>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="ml-4 text-lg font-semibold text-gray-900 dark:text-white">
              {completionRate}%
            </span>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {tasks.length === 0
              ? "No tasks added yet. Start by creating your first task!"
              : `You've completed ${stats.completed} out of ${stats.total} tasks`}
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tasks by Priority
          </h2>
          <div className="flex items-end justify-around h-40">
            {renderPriorityBar(
              "Low",
              tasks.filter((t) => t.priority === "low").length,
              tasks.length,
              "bg-green-500"
            )}
            {renderPriorityBar(
              "Medium",
              tasks.filter((t) => t.priority === "medium").length,
              tasks.length,
              "bg-yellow-500"
            )}
            {renderPriorityBar(
              "High",
              tasks.filter((t) => t.priority === "high").length,
              tasks.length,
              "bg-red-500"
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}

const StatCard = ({ title, value, icon, className }: StatCardProps) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`p-6 rounded-xl shadow-lg text-white ${className}`}
  >
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </div>
      <div className="p-3 bg-white bg-opacity-20 rounded-lg">{icon}</div>
    </div>
  </motion.div>
);

const renderPriorityBar = (
  label: string,
  count: number,
  total: number,
  color: string
) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const height = total > 0 ? Math.max(percentage, 5) : 5; // Minimum 5% height for visibility

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 font-medium">{count}</div>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${height}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`w-16 ${color} rounded-t-lg`}
      ></motion.div>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
};
