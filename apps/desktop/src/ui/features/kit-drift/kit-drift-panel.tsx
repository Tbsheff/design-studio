import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { KitDriftHead } from "./kit-drift-head.js";
import { KitDriftRow } from "./kit-drift-row.js";
import { useKitDrift } from "./use-kit-drift.js";

interface KitDriftScope {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface KitDriftPanelProps {
  readonly onSelect: (selector: string) => void;
  readonly scope: KitDriftScope;
}

const KitDriftPanel = ({
  onSelect,
  scope,
}: KitDriftPanelProps): ReactElement | null => {
  const { directionId, projectId } = scope;
  const drift = useKitDrift({ directionId, projectId });

  if (directionId === null) {
    return null;
  }

  if (drift.items.length === 0 && drift.error === null) {
    return null;
  }

  return (
    <section aria-label={copy.title} className="review-group">
      <KitDriftHead
        count={drift.items.length}
        hasHigh={drift.hasHigh}
        isBusy={drift.isBusy}
        onSwapAll={drift.handleSwapAll}
      />
      {drift.error !== null && <div className="alert error">{drift.error}</div>}
      <ul className="review-list">
        {drift.items.map((item) => (
          <KitDriftRow
            isBusy={drift.isBusy}
            item={item}
            key={item.id}
            onSelect={onSelect}
            onSwap={drift.handleSwap}
          />
        ))}
      </ul>
    </section>
  );
};

export { KitDriftPanel };

export type { KitDriftPanelProps, KitDriftScope };
