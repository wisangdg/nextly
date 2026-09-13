import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onQuickAdd: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onQuickAdd,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is actively typing in form inputs
      const target = e.target as HTMLElement | null;
      const isInputActive =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInputActive) return;

      // Alt+N for quick add
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        onQuickAdd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onQuickAdd]);

  return null;
};
