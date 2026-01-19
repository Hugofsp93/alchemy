import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [mageTheme, setMageTheme] = useState(localStorage.getItem("alchemy-mage-theme") || "purple");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-mage-theme", mageTheme);
    localStorage.setItem("alchemy-mage-theme", mageTheme);
    getCurrentWindow().setTheme(isDarkMode ? "dark" : "light").catch(console.error);
  }, [isDarkMode, mageTheme]);

  return {
    isDarkMode,
    setIsDarkMode,
    mageTheme,
    setMageTheme,
    toggleTheme: () => setIsDarkMode(prev => !prev)
  };
}
