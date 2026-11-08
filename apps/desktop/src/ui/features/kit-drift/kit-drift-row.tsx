import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toDetail, toPlace, toSelector, toTone } from "./kit-drift-model.js";
import type { KitDriftView } from "./kit-drift-model.js";

interface KitDriftRowProps {
  readonly isBusy: boolean;
  readonly item: KitDriftView;
  readonly onSelect: (selector: string) => void;
  readonly onSwap: (id: string) => void;
}

const KitDriftRow = ({
  isBusy,
  item,
  onSelect,
  onSwap,
}: KitDriftRowProps): ReactElement => {
  const selectItem = useCallback((): void => {
    onSelect(toSelector(item));
  }, [item, onSelect]);

  const swapItem = useCallback((): void => {
    onSwap(item.id);
  }, [item.id, onSwap]);

  return (
    <li className="review-row">
      <button
        className="review-target"
        data-tip={copy.selectTip}
        onClick={selectItem}
        type="button"
      >
        <span className={`review-sev ${toTone(item)}`} />
        <span className="truncate">{`${item.tag} ${copy.arrow} ${toDetail(item)}`}</span>
      </button>
      <div className="review-actions">
        <code className="review-src truncate">{toPlace(item)}</code>
        <button
          className="btn small"
          data-tip={copy.swapTip}
          data-tip-align="end"
          disabled={isBusy}
          onClick={swapItem}
          type="button"
        >
          {copy.swap}
        </button>
      </div>
    </li>
  );
};

export { KitDriftRow };
