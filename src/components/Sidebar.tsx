import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  Squares2X2Icon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface SidebarProps {
  currentView: "dashboard" | "tasks";
  setCurrentView: (view: "dashboard" | "tasks") => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const navigation = [
    { name: "Dashboard", view: "dashboard", icon: Squares2X2Icon },
    { name: "Tasks", view: "tasks", icon: CheckCircleIcon },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col flex-grow pt-5 bg-gradient-to-b from-primary-700 to-primary-900 dark:from-secondary-800 dark:to-secondary-900 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
            <CheckCircleIcon
              className="h-6 w-6 text-primary-700"
              aria-hidden="true"
            />
          </div>
          <h1 className="ml-3 text-xl font-bold text-white">TaskMe</h1>
        </motion.div>
      </div>
      <div className="mt-8 flex-grow flex flex-col">
        <nav className="flex-1 px-2 pb-4 space-y-2">
          {navigation.map((item) => {
            const isActive = currentView === item.view;
            return (
              <motion.button
                key={item.name}
                className={`
                  group flex items-center px-4 py-3 text-lg font-medium rounded-lg w-full
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-white text-primary-700 dark:bg-secondary-700 dark:text-white shadow-md"
                      : "text-white hover:bg-primary-600 dark:hover:bg-secondary-700 hover:bg-opacity-50"
                  }
                `}
                onClick={() =>
                  setCurrentView(item.view as "dashboard" | "tasks")
                }
                whileHover={{ x: isActive ? 0 : 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon
                  className={`mr-3 h-6 w-6 ${
                    isActive ? "text-primary-700 dark:text-white" : "text-white"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-2 w-1.5 h-8 bg-primary-500 dark:bg-accent-400 rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      <div className="p-4">
        <div className="p-3 bg-primary-800/50 dark:bg-secondary-700/50 rounded-lg">
          <p className="text-xs text-white/80 text-center">
            © {new Date().getFullYear()} TaskMe App
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile menu */}
      <Transition.Root show={isMobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 flex z-40 md:hidden"
          onClose={setIsMobileMenuOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex-1 flex flex-col max-w-xs w-full">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </Transition.Child>
              <SidebarContent />
            </div>
          </Transition.Child>
          <div className="flex-shrink-0 w-14">
            {/* Dummy element to force sidebar to shrink to fit close icon */}
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
