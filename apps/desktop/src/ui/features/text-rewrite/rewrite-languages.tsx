import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RewriteMenuRow } from "./rewrite-menu-row.js";
import { LANGUAGE_ITEMS } from "./text-rewrite-model.js";

import styles from "./text-rewrite.module.css";

interface RewriteLanguagesProps {
  readonly onBack: () => void;
  readonly onPick: (code: string) => void;
}

const RewriteLanguages = ({
  onBack,
  onPick,
}: RewriteLanguagesProps): ReactElement => {
  const handleBack = useCallback((): void => {
    onBack();
  }, [onBack]);

  return (
    <div aria-label={copy.languages} className={styles.menu} role="menu">
      {LANGUAGE_ITEMS.map((item) => (
        <RewriteMenuRow
          key={item.code}
          label={item.label}
          value={item.code}
          onPick={onPick}
        />
      ))}
      <hr className={styles.divider} />
      <button
        className={styles.row}
        role="menuitem"
        type="button"
        onClick={handleBack}
      >
        {copy.back}
      </button>
    </div>
  );
};

export { RewriteLanguages };
