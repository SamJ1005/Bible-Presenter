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
        ::-webkit-scrollbar-thumb { background: #a5a5a5ff; border-radius: 4px; }
        ::-webkit-scrollbar-button:single-button { background-color: #eee; display: block; background-size: 10px; background-repeat: no-repeat; background-position: center; }
        ::-webkit-scrollbar-button:single-button:vertical:decrement { height: 14px; width: 14px; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpolygon points='50,20 90,80 10,80' fill='%23003399'/%3E%3C/svg%3E"); }
        ::-webkit-scrollbar-button:single-button:vertical:increment { height: 14px; width: 14px; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpolygon points='50,80 90,20 10,20' fill='%23003399'/%3E%3C/svg%3E"); }
      `;
    } else {
      style.innerHTML = `
        ::-webkit-scrollbar { width: 14px; }
        ::-webkit-scrollbar-track { background: #222; }
        ::-webkit-scrollbar-thumb { background: #00ff99; border-radius: 4px; }
        ::-webkit-scrollbar-button:single-button { background-color: #222; display: block; background-size: 10px; background-repeat: no-repeat; background-position: center; }
        ::-webkit-scrollbar-button:single-button:vertical:decrement { height: 14px; width: 14px; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpolygon points='50,20 90,80 10,80' fill='%2300ff99'/%3E%3C/svg%3E"); }
        ::-webkit-scrollbar-button:single-button:vertical:increment { height: 14px; width: 14px; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpolygon points='50,80 90,20 10,20' fill='%2300ff99'/%3E%3C/svg%3E"); }
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