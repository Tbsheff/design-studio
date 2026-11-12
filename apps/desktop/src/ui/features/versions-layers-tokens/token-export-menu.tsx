import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenExportList } from "./token-export-list.js";
import type {
  TokenExportFormat,
  TokenExportState,
} from "./use-token-export.js";
import { useTokenMenu } from "./use-token-menu.js";

import styles from "./token-export.module.css";

const TRIGGER_ICON_SIZE = 12;

interface TokenExportMenuProps {
  readonly exporter: TokenExportState;
}

const TokenExportMenu = ({ exporter }: TokenExportMenuProps): ReactNode => {
  const menu = useTokenMenu();
  const { close, menu: popup, root, trigger } = menu;
  const { handleRun } = exporter;
  let label: string = COPY.exportTitle;

  if (exporter.isBusy) {
    label = COPY.exportRunning;
  }

  const handlePick = useCallback(
    (format: TokenExportFormat): void => {
      close(true);
      handleRun(format);
    },
    [close, handleRun]
  );

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-tip={COPY.exportTip}
        data-tip-align="end"
        disabled={exporter.isBusy}
        onClick={menu.handleToggle}
      >
        <Icon name="download" size={TRIGGER_ICON_SIZE} />
        {label}
      </button>
      {menu.isOpen && (
        <TokenExportList
          menu={popup}
          onKeyDown={menu.handleKeyDown}
          onPick={handlePick}
        />
      )}
    </div>
  );
};

export { TokenExportMenu };
