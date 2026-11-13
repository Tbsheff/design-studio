import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { OverlayMenuItem } from "./overlay-menu-item.js";
import {
  toggleReader,
  toggleTabOrder,
  useOverlayMode,
} from "./tab-order-store.js";
import type { OverlayMode } from "./tab-order-store.js";
import { useOverlayMenu } from "./use-overlay-menu.js";

import styles from "./accessibility.module.css";

const toButtonText = (mode: OverlayMode): string => {
  if (mode === "reader") {
    return copy.readerText;
  }

  return copy.tabText;
};

const TabOrderToggle = (): ReactElement => {
  const mode = useOverlayMode();

  const { button, handleClose, handleKeyDown, handleToggle, isOpen, menu } =
    useOverlayMenu();

  let className = "btn small ghost select-toggle tab-order-toggle";

  if (mode !== "off") {
    className = `${className} on`;
  }

  return (
    <div className={styles.overlayMenu}>
      <button
        ref={button}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={copy.readerMenu}
        aria-pressed={mode !== "off"}
        className={className}
        data-tip={copy.readerMenuTip}
        type="button"
        onClick={handleToggle}
      >
        <span className="label">{toButtonText(mode)}</span>
      </button>
      {isOpen && (
        <div
          ref={menu}
          aria-label={copy.readerMenu}
          className={`ui-menu ${styles.overlayMenuPop}`}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <OverlayMenuItem
            isChecked={mode === "tabs"}
            label={copy.tabOrderItem}
            onClose={handleClose}
            onPick={toggleTabOrder}
          />
          <OverlayMenuItem
            isChecked={mode === "reader"}
            label={copy.readerItem}
            onClose={handleClose}
            onPick={toggleReader}
          />
        </div>
      )}
    </div>
  );
};

export { TabOrderToggle };
