import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { toCountLabel, toCountTip } from "./component-usage-model.js";
import { ComponentUsageSites } from "./component-usage-sites.js";
import { useComponentUsageLookup } from "./use-component-usage.js";

import styles from "./component-usage.module.css";

interface ComponentUsageCountProps {
  readonly usageKey: string;
}

const ComponentUsageCount = ({
  usageKey,
}: ComponentUsageCountProps): ReactNode => {
  const lookup = useComponentUsageLookup();
  const [isOpen, setIsOpen] = useState(false);
  const usage = lookup?.usageOf(usageKey) ?? null;

  const handleToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  if (usage === null) {
    return null;
  }

  return (
    <span className={styles.slot}>
      <button
        type="button"
        className={styles.count}
        aria-expanded={isOpen}
        data-unused={usage.importCount === 0}
        data-testid="component-usage-count"
        data-tip={toCountTip(usage)}
        data-tip-align="start"
        onClick={handleToggle}
      >
        {toCountLabel(usage)}
      </button>
      {isOpen && <ComponentUsageSites usage={usage} />}
    </span>
  );
};

export { ComponentUsageCount };
