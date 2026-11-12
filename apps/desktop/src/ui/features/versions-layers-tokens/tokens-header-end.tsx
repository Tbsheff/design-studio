import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { toThemeIcon } from "./tokens-panel-model.js";
import type { ThemeId } from "./tokens-panel-model.js";
import { TokensViewMenu } from "./tokens-view-menu.js";
import { useTokenMenu } from "./use-token-menu.js";

const TRIGGER_ICON_SIZE = 14;

interface TokensHeaderEndProps {
  readonly hasSweep: boolean;
  readonly isSweepOpen: boolean;
  readonly onSweepOpen: (update: (open: boolean) => boolean) => void;
  readonly onTheme: (theme: ThemeId) => void;
  readonly sweepLabel: string;
  readonly sweepTip: string;
  readonly theme: ThemeId;
}

const toggleOpen = (open: boolean): boolean => !open;

const TokensHeaderEnd = (props: TokensHeaderEndProps): ReactNode => {
  const { onSweepOpen, onTheme } = props;
  const menu = useTokenMenu();
  const { close, menu: popup, root, trigger } = menu;

  const handleTheme = useCallback(
    (next: ThemeId): void => {
      close(true);
      onTheme(next);
    },
    [close, onTheme]
  );

  const handleSweepToggle = useCallback((): void => {
    close(true);
    onSweepOpen(toggleOpen);
  }, [close, onSweepOpen]);

  return (
    <div className="ins-header-end" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small"
        aria-label={COPY.labelViewMenu}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-tip={COPY.tipViewMenu}
        data-tip-align="end"
        onClick={menu.handleToggle}
      >
        <Icon name={toThemeIcon(props.theme)} size={TRIGGER_ICON_SIZE} />
      </button>
      {menu.isOpen && (
        <TokensViewMenu
          hasSweep={props.hasSweep}
          isSweepOpen={props.isSweepOpen}
          menu={popup}
          sweepLabel={props.sweepLabel}
          sweepTip={props.sweepTip}
          theme={props.theme}
          onKeyDown={menu.handleKeyDown}
          onSweep={handleSweepToggle}
          onTheme={handleTheme}
        />
      )}
    </div>
  );
};

export { TokensHeaderEnd };
