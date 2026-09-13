import { Component, ErrorInfo, ReactNode } from "react";
import { ExclamationTriangleIcon, ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { extractEmergencyBackupData } from "../utils/emergencyRecovery.ts";
import type { EmergencyBackupData } from "../utils/emergencyRecovery.ts";

export { extractEmergencyBackupData };
export type { EmergencyBackupData };

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Nextly ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleDownloadBackup = () => {
    try {
      const result = extractEmergencyBackupData();
      if (!result.success || !result.blob) {
        alert(`Failed to extract emergency backup: ${result.error || "Storage unavailable."}`);
        return;
      }

      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Failed to extract backup: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-secondary-50 dark:bg-secondary-950 text-secondary-900 dark:text-white">
          <div className="max-w-md w-full bg-white dark:bg-secondary-800 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-700 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-6 leading-relaxed">
              An unexpected render error occurred. Your stored data is safe and has not been deleted.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-secondary-100 dark:bg-secondary-900 rounded-lg text-xs font-mono text-left overflow-auto max-h-28 text-red-600 dark:text-red-400">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full min-h-[44px] px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleDownloadBackup}
                className="w-full min-h-[44px] px-4 py-2 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 text-secondary-800 dark:text-secondary-200 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download Emergency Data Backup
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
