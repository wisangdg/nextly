import React, { useState } from "react";
import { Theme, ThemeContext } from "./themeContextDef.ts";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    let savedTheme: Theme | null = null;
    try {
      savedTheme = localStorage.getItem("theme") as Theme | null;
    } catch (e) {
      console.warn("Could not read theme from localStorage", e);
    }

    let prefersDark = false;
    try {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      // fallback
    }

    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    if (typeof document !== "undefined") {
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    return initialTheme;
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";

      try {
        localStorage.setItem("theme", newTheme);
      } catch (e) {
        console.warn("Could not save theme to localStorage", e);
      }

      if (typeof document !== "undefined") {
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
