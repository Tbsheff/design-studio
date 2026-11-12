import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { ThemeEntry, ThemeId } from "./tokens-panel-model.js";

const ITEM_ICON_SIZE = 14;
const ITEM_ROLE = "menuitemradio";

interface TokenThemeItemProps {
  readonly entry: ThemeEntry;
  readonly isActive: boolean;
  readonly onTheme: (theme: ThemeId) => void;
}

const TokenThemeItem = ({
  entry,
  isActive,
  onTheme,
}: TokenThemeItemProps): ReactNode => {
  const handleTheme = useCallback((): void => {
    onTheme(entry.id);
  }, [entry.id, onTheme]);

  return (
    <button
      type="button"
      role={ITEM_ROLE}
      className="ui-menu-item"
      tabIndex={-1}
      aria-checked={isActive}
      onClick={handleTheme}
    >
      <Icon name={entry.icon} size={ITEM_ICON_SIZE} />
      <span>{entry.label}</span>
    </button>
  );
};

export { TokenThemeItem };
