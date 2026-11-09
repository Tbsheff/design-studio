import { useCallback } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import {
  toSiteLabel,
  toSitePlace,
  toSiteSelector,
} from "./token-usage-model.js";
import type { TokenUsageSite as Site } from "./token-usage-model.js";
import { useTokenUsageLookup } from "./use-token-usage.js";

import styles from "./token-usage.module.css";

interface TokenUsageSiteProps {
  readonly site: Site;
}

const TokenUsageSite = ({ site }: TokenUsageSiteProps): ReactNode => {
  const lookup = useTokenUsageLookup();

  const handleSelect = useCallback((): void => {
    lookup?.onSelectSite(toSiteSelector(site));
  }, [lookup, site]);

  return (
    <li>
      <button
        type="button"
        className={styles.site}
        data-tip={`${COPY.usageSelectTip}: ${toSitePlace(site)}`}
        data-tip-align="end"
        onClick={handleSelect}
      >
        <span className="truncate">{toSiteLabel(site)}</span>
      </button>
    </li>
  );
};

export { TokenUsageSite };
