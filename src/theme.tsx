import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";
export const themeKey = "student-performance-theme";

export function resolveTheme(
  saved: string | null,
  prefersDark: boolean,
): Theme {
  return saved === "light" || saved === "dark"
    ? saved
    : prefersDark
      ? "dark"
      : "light";
}

function readTheme(): Theme {
  let saved = null;
  try {
    saved = localStorage.getItem(themeKey);
  } catch {
    /* In-memory fallback. */
  }
  return resolveTheme(
    saved,
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#15171C" : "#F6F5FA");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const refresh = () => setTheme(readTheme());
    const storage = (event: StorageEvent) => {
      if (event.key === themeKey || event.key === null) refresh();
    };
    media.addEventListener("change", refresh);
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", refresh);
      window.removeEventListener("storage", storage);
    };
  }, []);
  const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  return (
    <button
      type="button"
      className="icon theme-toggle"
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
        try {
          localStorage.setItem(themeKey, next);
        } catch {
          /* Keep this visit usable. */
        }
      }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
