import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { toCountTip } from "./token-usage-model.js";
import { TokenUsageSites } from "./token-usage-sites.js";
import { useTokenUsageLookup } from "./use-token-usage.js";

import styles from "./token-usage.module.css";

interface TokenUsageCountProps {
  readonly name: string;
}

const TokenUsageCount = ({ name }: TokenUsageCountProps): ReactNode => {
  const lookup = useTokenUsageLookup();
  const [isOpen, setIsOpen] = useState(false);
  const usage = lookup?.usageOf(name) ?? null;

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
        data-unused={usage.useCount === 0}
        data-tip={toCountTip(usage)}
        data-tip-align="end"
        onClick={handleToggle}
      >
        {usage.useCount}
      </button>
      {isOpen && <TokenUsageSites usage={usage} />}
    </span>
  );
};

export { TokenUsageCount };
