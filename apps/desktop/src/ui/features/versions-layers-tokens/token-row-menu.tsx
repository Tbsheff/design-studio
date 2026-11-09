import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { TokenMenuItem } from "./token-menu-item.js";
import { TOKEN_RENAME_COPY } from "./token-rename-copy.js";
import { toDeleteReason } from "./token-rename-model.js";
import { useTokenMenu } from "./use-token-menu.js";

import styles from "./token-rename.module.css";

const TRIGGER_ICON_SIZE = 14;
const HIDDEN_STYLE = { visibility: "hidden" } as const;

interface TokenRowMenuProps {
  readonly name: string;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly useCount: number | null;
}

const toDeleteBlock = (useCount: number | null): string | null => {
  if (useCount !== null && useCount > 0) {
    return toDeleteReason(useCount);
  }

  return null;
};

const TokenRowMenu = ({
  name,
  onDelete,
  onRename,
  useCount,
}: TokenRowMenuProps): ReactNode => {
  const menu = useTokenMenu();
  const { close, menu: popup, root, trigger } = menu;

  const handleRename = useCallback((): void => {
    close(false);
    onRename();
  }, [close, onRename]);

  const handleDelete = useCallback((): void => {
    close(false);
    onDelete();
  }, [close, onDelete]);

  return (
    <div className={styles.menuRoot} ref={root}>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small"
        aria-label={`${TOKEN_RENAME_COPY.menuTriggerPrefix}${name}`}
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        data-testid="token-row-menu"
        onClick={menu.handleToggle}
      >
        <Icon name="more" size={TRIGGER_ICON_SIZE} />
      </button>
      {menu.isOpen && (
        <div
          ref={popup}
          className={`ui-menu ${styles.menu}`}
          role="menu"
          tabIndex={-1}
          aria-label={TOKEN_RENAME_COPY.menuLabel}
          style={HIDDEN_STYLE}
          onKeyDown={menu.handleKeyDown}
        >
          <TokenMenuItem
            block={null}
            icon="pencil"
            label={TOKEN_RENAME_COPY.renameLabel}
            testId="token-rename-item"
            onPick={handleRename}
          />
          <TokenMenuItem
            block={toDeleteBlock(useCount)}
            icon="trash"
            label={TOKEN_RENAME_COPY.deleteLabel}
            testId="token-delete-item"
            onPick={handleDelete}
          />
        </div>
      )}
    </div>
  );
};

export { TokenRowMenu };
