import type { ReactNode } from "react";

import type { ComponentUsageView } from "./component-usage-model.js";
import { ComponentUsageSite } from "./component-usage-site.js";
import { COPY } from "./copy.js";

import styles from "./component-usage.module.css";

interface ComponentUsageSitesProps {
  readonly usage: ComponentUsageView;
}

const ComponentUsageSites = ({
  usage,
}: ComponentUsageSitesProps): ReactNode => (
  <ul className={styles.sites} aria-label={COPY.usageSitesLabel}>
    {usage.samples.length === 0 && (
      <li className={styles.none}>{COPY.usageNoSites}</li>
    )}
    {usage.samples.map((site) => (
      <ComponentUsageSite key={`${site.file}:${site.line}`} site={site} />
    ))}
  </ul>
);

export { ComponentUsageSites };
