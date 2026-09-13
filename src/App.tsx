import { useState } from "react";
import { TaskProvider } from "./context/TaskContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { ModalProvider } from "./context/ModalContext.tsx";
import { useTasks } from "./context/useTasks.ts";
import { useModal } from "./context/useModal.ts";
import { Dashboard } from "./components/Dashboard.tsx";
import { TaskList, SavedView } from "./components/TaskList.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { Header } from "./components/Header.tsx";
import { QuickAddTask } from "./components/QuickAddTask.tsx";
import { TaskEditModal } from "./components/TaskEditModal.tsx";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts.tsx";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

function MainLayout() {
  const [currentView, setCurrentView] = useState<"dashboard" | "tasks">("dashboard");
  const [taskListPresetView, setTaskListPresetView] = useState<SavedView>("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const {
    isCorrupted,
    storageError,
    hasExternalTabUpdate,
    syncFromStorage,
    downloadRawCorruptedBackup,
    resetCorruptedStorage,
    isInitialLoadFailed,
    retryLoadStorage,
    loadError,
  } = useTasks();

  const { openTaskCreateModal } = useModal();

  const handleNavigateFromDashboard = (preset?: { view?: string }) => {
    if (preset?.view) {
      setTaskListPresetView(preset.view as SavedView);
    } else {
      setTaskListPresetView("all");
    }
    setCurrentView("tasks");
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 text-secondary-900 dark:text-white transition-colors duration-150 flex flex-col">
      {/* S03: Initial Storage Load Failure Banner */}
      {isInitialLoadFailed && (
        <div className="bg-red-700 text-white px-4 py-3 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-3 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>
              Initial storage access failed ({loadError || "storage unreadable"}). Write operations are locked to prevent overwriting existing data.
            </span>
          </div>
          <button
            onClick={retryLoadStorage}
            className="min-h-[44px] px-4 py-2 bg-white text-red-800 hover:bg-red-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Retry Loading Storage
          </button>
        </div>
      )}

      {/* Recovery & Cross-tab Banners */}
      {hasExternalTabUpdate && (
        <div className="bg-primary-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>Tasks were updated in another tab or window.</span>
          </div>
          <button
            onClick={syncFromStorage}
            className="min-h-[44px] px-4 py-2 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      )}

      {isCorrupted && (
        <div className="bg-amber-600 text-white px-4 py-3 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between gap-3 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>
              Corrupted data detected in local storage. To protect your data, it was not overwritten automatically.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadRawCorruptedBackup}
              className="min-h-[44px] px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Download Raw Backup
            </button>
            <button
              onClick={resetCorruptedStorage}
              className="min-h-[44px] px-3.5 py-2 bg-white text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reset Storage
            </button>
          </div>
        </div>
      )}

      {storageError && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-medium flex items-center gap-2 sticky top-0 z-30">
          <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
          <span>Storage quota exceeded or disabled. Changes are kept in memory only.</span>
        </div>
      )}

      {/* App Body */}
      <div className="flex flex-1 h-screen overflow-hidden">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <Header
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            onQuickAdd={() => setIsQuickAddOpen(true)}
            onNewTaskFull={() => openTaskCreateModal()}
          />

          <main className="relative flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {currentView === "dashboard" ? (
                <Dashboard
                  key="dashboard"
                  onNavigateToTasks={handleNavigateFromDashboard}
                />
              ) : (
                <TaskList
                  key={`tasklist-${taskListPresetView}`}
                  initialView={taskListPresetView}
                />
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <QuickAddTask
            isOpen={isQuickAddOpen}
            onClose={() => setIsQuickAddOpen(false)}
          />
        )}
      </AnimatePresence>

      <TaskEditModal />

      {/* Centralized Keyboard Shortcut (F09 fix) */}
      <KeyboardShortcuts onQuickAdd={() => setIsQuickAddOpen(true)} />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "dark:bg-secondary-800 dark:text-white dark:border dark:border-secondary-700 text-sm font-medium",
          duration: 3500,
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TaskProvider>
        <ModalProvider>
          <ErrorBoundary>
            <MainLayout />
          </ErrorBoundary>
        </ModalProvider>
      </TaskProvider>
    </ThemeProvider>
  );
}

export default App;
