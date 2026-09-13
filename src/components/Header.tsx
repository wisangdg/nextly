import React from "react";
import { useTheme } from "../context/useTheme.ts";
import {
  MoonIcon,
  SunIcon,
  Bars3Icon,
  PlusIcon,
} from "@heroicons/react/24/outline";

interface HeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onQuickAdd: () => void;
  onNewTaskFull: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  setIsMobileMenuOpen,
  onQuickAdd,
  onNewTaskFull,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex-shrink-0 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md border-b border-secondary-200/80 dark:border-secondary-800 transition-colors">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="inline-flex md:hidden items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg text-secondary-600 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="hidden md:block">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Workspace
              </span>
              <h2 className="text-base font-bold text-secondary-900 dark:text-white">
                Task Management
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Add with keyboard shortcut hint */}
            <button
              onClick={onQuickAdd}
              type="button"
              className="inline-flex items-center min-h-[44px] px-3 sm:px-3.5 py-2 text-sm font-medium rounded-xl bg-secondary-100 text-secondary-800 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              title="Quick Add Task (Alt+N)"
            >
              <PlusIcon className="h-4 w-4 mr-1.5 text-secondary-500 dark:text-secondary-400" aria-hidden="true" />
              <span>Quick Add</span>
              <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono text-secondary-500 dark:text-secondary-400 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded shadow-xs">
                Alt+N
              </kbd>
            </button>

            {/* Detailed New Task button */}
            <button
              onClick={onNewTaskFull}
              type="button"
              className="inline-flex items-center min-h-[44px] px-3.5 sm:px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-xs hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
            >
              <PlusIcon className="h-4 w-4 mr-1 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center justify-center cursor-pointer"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-5 w-5 text-secondary-700" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
