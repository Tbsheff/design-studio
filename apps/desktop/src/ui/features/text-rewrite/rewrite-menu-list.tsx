import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RewriteMenuRow } from "./rewrite-menu-row.js";
import { MODE_ITEMS } from "./text-rewrite-model.js";
import type { RewriteMode } from "./text-rewrite-model.js";

import styles from "./text-rewrite.module.css";

interface RewriteMenuListProps {
  readonly onLanguages: () => void;
  readonly onPick: (mode: RewriteMode) => void;
}

const RewriteMenuList = ({
  onLanguages,
  onPick,
}: RewriteMenuListProps): ReactElement => {
  const handleTranslate = useCallback((): void => {
    onLanguages();
  }, [onLanguages]);

  return (
    <div aria-label={copy.menu} className={styles.menu} role="menu">
      {MODE_ITEMS.map((item) => (
        <RewriteMenuRow
          key={item.mode}
          label={item.label}
          value={item.mode}
          onPick={onPick}
        />
      ))}
      <hr className={styles.divider} />
      <button
        className={styles.row}
        role="menuitem"
        type="button"
        onClick={handleTranslate}
      >
        {copy.translate}
      </button>
    </div>
  );
};

export { RewriteMenuList };
