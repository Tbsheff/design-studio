import type { ReactNode } from "react";

import { toEmptyText } from "./component-usage-model.js";
import { ComponentsNotice } from "./components-notice.js";
import type { Item } from "./components-panel-model.js";
import { ComponentsUsageChip } from "./components-usage-chip.js";
import type { ComponentUsage } from "./use-component-usage.js";

interface ComponentsUsageBarProps {
  readonly canInsert: boolean;
  readonly query: string;
  readonly shown: readonly Item[];
  readonly usage: ComponentUsage;
}

const ComponentsUsageBar = ({
  canInsert,
  query,
  shown,
  usage,
}: ComponentsUsageBarProps): ReactNode => (
  <>
    {canInsert && usage.unusedCount !== null && (
      <ComponentsUsageChip
        count={usage.unusedCount}
        isOn={usage.isUnusedOnly}
        onToggle={usage.handleToggle}
      />
    )}
    <ComponentsNotice text={toEmptyText(query, usage.isUnusedOnly, shown)} />
  </>
);

export { ComponentsUsageBar };
