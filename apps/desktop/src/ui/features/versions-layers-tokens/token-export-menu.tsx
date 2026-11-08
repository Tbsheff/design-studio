import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { COPY } from "./copy.js";
import { TokenExportList } from "./token-export-list.js";
import { TokenExportResult } from "./token-export-result.js";
import { useMenuPlace } from "./use-menu-place.js";
import { useTokenExport } from "./use-token-export.js";
import type {
  TokenExportFormat,
  TokenExportSetup,
} from "./use-token-export.js";
import { runMenuKey } from "./version-menu-model.js";

import styles from "./token-export.module.css";

interface TokenExportMenuProps {
  readonly setup: TokenExportSetup;
}

const TokenExportMenu = ({ setup }: TokenExportMenuProps): ReactNode => {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const exporter = useTokenExport(setup);
  const { handleRun } = exporter;
  let label: string = COPY.exportTitle;

  if (exporter.isBusy) {
    label = COPY.exportRunning;
  }

  const close = useCallback((refocus: boolean): void => {
    setIsOpen(false);

    if (refocus) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  usePopover(isOpen, root, close);
  useMenuPlace(isOpen, trigger, menu);

  const handleToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      runMenuKey(event, close);
    },
    [close]
  );

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
        aria-expanded={isOpen}
        data-tip={COPY.exportTip}
        disabled={exporter.isBusy}
        onClick={handleToggle}
      >
        {label}
      </button>
      {isOpen && (
        <TokenExportList
          menu={menu}
          onKeyDown={handleKeyDown}
          onPick={handlePick}
        />
      )}
      {exporter.error !== null && (
        <p className={styles.error} role="alert">
          {exporter.error}
        </p>
      )}
      {exporter.result !== null && (
        <TokenExportResult
          isCopied={exporter.isCopied}
          onCopy={exporter.handleCopy}
          onSave={exporter.handleSave}
          view={exporter.result}
        />
      )}
    </div>
  );
};

export { TokenExportMenu };
