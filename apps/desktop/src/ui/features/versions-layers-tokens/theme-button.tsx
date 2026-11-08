import { useCallback } from "react";
import type { ReactNode } from "react";

import type { ThemeEntry, ThemeId } from "./tokens-panel-model.js";

interface ThemeButtonProps {
  readonly entry: ThemeEntry;
  readonly isActive: boolean;
  readonly onTheme: (theme: ThemeId) => void;
}

const ThemeButton = ({
  entry,
  isActive,
  onTheme,
}: ThemeButtonProps): ReactNode => {
  const handleTheme = useCallback((): void => {
    onTheme(entry.id);
  }, [entry.id, onTheme]);

  let className = "";

  if (isActive) {
    className = "on";
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={isActive}
      onClick={handleTheme}
    >
      {entry.label}
    </button>
  );
};

export { ThemeButton };
