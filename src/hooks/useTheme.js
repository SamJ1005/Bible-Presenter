import {
  useState,
  useCallback,
  useEffect
} from "react";
import {
  saveMemory,
  loadMemory
} from "./useLocalMemory";

export default function useTheme() {
  const [theme, setTheme] = useState(() => loadMemory("theme", "light"));

  // Create the persistent style tag ONCE
  useEffect(() => {
    let style = document.getElementById("bp-scroll-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "bp-scroll-style";
      document.head.appendChild(style);
    }
  }, []);

  const applyThemeGlobals = useCallback(() => {
    // Update html class for global CSS
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);

    // Body color
    document.body.style.background = theme === "dark" ? "#0f0e0e" : "#ffffff";
    document.body.style.color = theme === "dark" ? "white" : "black";

    // Scrollbar
    const style = document.getElementById("bp-scroll-style");
    if (!style) return;

    if (theme === "light") {
      style.innerHTML = `
        ::-webkit-scrollbar { width: 14px; }
        ::-webkit-scrollbar-track { background: #eee; }
        ::-webkit-scrollbar-thumb { background: #a5a5a5ff; }
      `;
    } else {
      style.innerHTML = `
        ::-webkit-scrollbar { width: 14px; }
        ::-webkit-scrollbar-track { background: #222; }
        ::-webkit-scrollbar-thumb { background: #00ff99; }
      `;
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveMemory("theme", next);
  };

  // Apply theme on first mount + on change
  useEffect(() => {
    applyThemeGlobals();
  }, [theme, applyThemeGlobals]);

  return {
    theme,
    toggleTheme,
    applyThemeGlobals,
  };
}