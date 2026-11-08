import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { ThemeButton } from "./theme-button.js";
import { THEMES } from "./tokens-panel-model.js";
import type { ThemeId } from "./tokens-panel-model.js";

const GROUP_ROLE = "group";

interface ThemeToggleProps {
  readonly onTheme: (theme: ThemeId) => void;
  readonly theme: ThemeId;
}

const ThemeToggle = ({ onTheme, theme }: ThemeToggleProps): ReactNode => (
  <div
    className="segmented tkp-theme"
    role={GROUP_ROLE}
    aria-label={COPY.labelPreviewTheme}
  >
    {THEMES.map((entry) => (
      <ThemeButton
        key={entry.label}
        entry={entry}
        isActive={theme === entry.id}
        onTheme={onTheme}
      />
    ))}
  </div>
);

export { ThemeToggle };
