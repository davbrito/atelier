import { create } from "zustand";

type Theme = "light" | "dark";

const useThemeStore = create<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}>((set, get) => {
  const persistTheme = (next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    root.setAttribute("data-theme", next);
    root.style.colorScheme = next;
    window.localStorage.setItem("theme", next);
    set({ theme: next });
  };

  return {
    theme: "light",
    setTheme: (theme) => {
      persistTheme(theme);
    },
    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      persistTheme(next);
    },
  };
});

function resolveTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function loadTheme() {
  useThemeStore.setState({ theme: resolveTheme() });
}

export function useTheme() {
  const state = useThemeStore();

  return state;
}
