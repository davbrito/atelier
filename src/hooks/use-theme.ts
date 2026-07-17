import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function resolveTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveTheme);

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  const setThemeAndPersist = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.setAttribute("data-theme", next);
    root.style.colorScheme = next;
    window.localStorage.setItem("theme", next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeAndPersist(theme === "dark" ? "light" : "dark");
  }, [theme, setThemeAndPersist]);

  return { theme, setTheme: setThemeAndPersist, toggleTheme };
}
