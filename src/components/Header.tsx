import React from "react";
import { useTheme } from "../context/ThemeContext";
import {
  MoonIcon,
  SunIcon,
  Bars3Icon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

interface HeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onQuickAdd: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  setIsMobileMenuOpen,
  onQuickAdd,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex-shrink-0 bg-white dark:bg-gray-800 shadow">
      <div className="px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex md:hidden items-center justify-center w-10 h-10 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">Open sidebar</span>
            </button>
            <div className="hidden md:flex md:items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                TaskMe
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={onQuickAdd}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 text-sm rounded-md 
                bg-primary-100 text-primary-700 hover:bg-primary-200 
                dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 
                transition-colors duration-200"
            >
              <PlusCircleIcon className="h-5 w-5" />
              <span className="hidden sm:inline-block ml-1">Quick Add</span>
              <span className="hidden lg:inline-block ml-1 text-xs opacity-75">
                (Alt+N)
              </span>
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
