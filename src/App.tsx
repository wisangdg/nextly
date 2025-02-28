import { useState, useEffect } from "react";
import { TaskProvider } from "./context/TaskContext";
import { Dashboard } from "./components/Dashboard";
import { TaskList } from "./components/TaskList";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { QuickAddTask } from "./components/QuickAddTask";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { ModalProvider } from "./context/ModalContext";
import { TaskEditModal } from "./components/TaskEditModal";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { AnimatePresence } from "framer-motion";
import { Task } from "./types/Task"; // We'll use this imported type only

function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "tasks">(
    "dashboard"
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N to open quick add
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
      // Esc to close quick add
      if (e.key === "Escape" && isQuickAddOpen) {
        setIsQuickAddOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuickAddOpen]);

  useEffect(() => {
    // Load tasks from local storage or an API
    try {
      const storedTasks = localStorage.getItem("tasks");
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError("Failed to load tasks.");
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    // Save tasks to local storage
    try {
      localStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError("Failed to save tasks.");
        console.error(e);
      }
    }
  }, [tasks]);

  return (
    <ThemeProvider>
      <TaskProvider>
        <ModalProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {error && (
              <div className="text-red-500 p-4 bg-red-100 dark:bg-red-800 dark:text-red-100">
                {error}
              </div>
            )}
            <div className="flex h-screen overflow-hidden">
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
                />
                <main className="relative flex-1 overflow-y-auto focus:outline-none p-4 md:p-6">
                  <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                      {currentView === "dashboard" ? (
                        <Dashboard key="dashboard" />
                      ) : (
                        <TaskList key="tasklist" />
                      )}
                    </AnimatePresence>
                  </div>
                </main>
              </div>
            </div>
            <AnimatePresence>
              {isQuickAddOpen && (
                <QuickAddTask
                  onClose={() => setIsQuickAddOpen(false)}
                  isOpen={isQuickAddOpen}
                />
              )}
            </AnimatePresence>
            <TaskEditModal />
            <KeyboardShortcuts onQuickAdd={() => setIsQuickAddOpen(true)} />
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "dark:bg-gray-800 dark:text-white",
                duration: 3000,
              }}
            />
          </div>
        </ModalProvider>
      </TaskProvider>
    </ThemeProvider>
  );
}

export default App;
