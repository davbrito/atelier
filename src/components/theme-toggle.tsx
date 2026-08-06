import { Moon, Sun } from "lucide-react";
import { useId } from "react";
import { Switch } from "#/components/ui/switch";
import { useTheme } from "#/hooks/use-theme";

export function ThemeToggle() {
  const id = useId();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <label
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm"
      htmlFor={id}
    >
      <span className="flex items-center gap-2 text-sidebar-foreground">
        {isDark ? <Moon key="moon" className="size-4" /> : <Sun key="sun" className="size-4" />}
        Modo oscuro
      </span>
      <Switch
        id={id}
        size="sm"
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Alternar modo oscuro"
      />
    </label>
  );
}
