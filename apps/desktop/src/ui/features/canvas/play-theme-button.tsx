import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { playThemeCopy } from "./play-theme-copy.js";
import type { PlayTheme } from "./use-play-theme.js";

const toTip = (isDark: boolean): string => {
  if (isDark) {
    return playThemeCopy.tipDark;
  }

  return playThemeCopy.tipLight;
};

const PlayThemeButton = ({ theme }: { theme: PlayTheme }): ReactElement => {
  const { isDark, onToggle } = theme;

  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={playThemeCopy.label}
      aria-pressed={isDark}
      data-tip={toTip(isDark)}
      data-testid="play-theme-toggle"
      onClick={onToggle}
    >
      <Icon name="moon" size={14} />
    </button>
  );
};

export { PlayThemeButton };
