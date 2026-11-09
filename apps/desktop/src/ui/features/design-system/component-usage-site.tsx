import { useCallback } from "react";
import type { ReactNode } from "react";

import { toSiteLabel, toSitePlace } from "./component-usage-model.js";
import type { ComponentUsageSite as Site } from "./component-usage-model.js";
import { COPY } from "./copy.js";
import { useComponentUsageLookup } from "./use-component-usage.js";

import styles from "./component-usage.module.css";

interface ComponentUsageSiteProps {
  readonly site: Site;
}

const ComponentUsageSite = ({ site }: ComponentUsageSiteProps): ReactNode => {
  const lookup = useComponentUsageLookup();

  const handleOpen = useCallback((): void => {
    lookup?.onOpenSite(site);
  }, [lookup, site]);

  return (
    <li>
      <button
        type="button"
        className={styles.site}
        data-tip={`${COPY.usageOpenTip}: ${toSitePlace(site)}`}
        data-tip-align="start"
        onClick={handleOpen}
      >
        <span className={styles.label}>{toSiteLabel(site)}</span>
      </button>
    </li>
  );
};

export { ComponentUsageSite };
