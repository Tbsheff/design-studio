import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ThemeHalf } from "./theme-half.js";
import type { ThemeItem } from "./theme-model.js";

import styles from "./theme.module.css";

interface ThemeCardProps {
  readonly isBusy: boolean;
  readonly item: ThemeItem;
  readonly onApply: (item: ThemeItem) => void;
  readonly onToggle: (item: ThemeItem) => void;
}

const ThemeCard = ({
  isBusy,
  item,
  onApply,
  onToggle,
}: ThemeCardProps): ReactElement => {
  const handleToggle = useCallback(() => onToggle(item), [item, onToggle]);
  const handleApply = useCallback(() => onApply(item), [item, onApply]);
  let tip: string = copy.liveTip;

  if (item.isActive) {
    tip = copy.clearTip;
  }

  return (
    <li className={styles.item}>
      <button
        aria-pressed={item.isActive}
        className={styles.card}
        data-tip={tip}
        disabled={isBusy}
        onClick={handleToggle}
        type="button"
      >
        <ThemeHalf item={item} mode="light" />
        <ThemeHalf item={item} mode="dark" />
        <span className={styles.name}>{item.name}</span>
      </button>
      {item.isActive && (
        <button
          className={styles.apply}
          data-tip={copy.applyTip}
          disabled={isBusy}
          onClick={handleApply}
          type="button"
        >
          {copy.apply}
        </button>
      )}
    </li>
  );
};

export { ThemeCard };
