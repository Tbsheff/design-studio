import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenThemeItem } from "./token-theme-item.js";
import { THEMES } from "./tokens-panel-model.js";
import type { ThemeId } from "./tokens-panel-model.js";

const GROUP_ROLE = "group";

interface TokenThemeGroupProps {
  readonly onTheme: (theme: ThemeId) => void;
  readonly theme: ThemeId;
}

const TokenThemeGroup = ({
  onTheme,
  theme,
}: TokenThemeGroupProps): ReactNode => (
  <div
    className="ui-menu-section"
    role={GROUP_ROLE}
    aria-label={COPY.labelPreviewTheme}
  >
    <span className="ui-menu-label" aria-hidden="true">
      {COPY.labelPreviewTheme}
    </span>
    {THEMES.map((entry) => (
      <TokenThemeItem
        key={entry.label}
        entry={entry}
        isActive={theme === entry.id}
        onTheme={onTheme}
      />
    ))}
  </div>
);

export { TokenThemeGroup };
