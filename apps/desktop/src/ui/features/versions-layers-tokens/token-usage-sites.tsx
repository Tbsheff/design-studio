import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { TokenUsageView } from "./token-usage-model.js";
import { TokenUsageSite } from "./token-usage-site.js";

import styles from "./token-usage.module.css";

interface TokenUsageSitesProps {
  readonly usage: TokenUsageView;
}

const TokenUsageSites = ({ usage }: TokenUsageSitesProps): ReactNode => (
  <ul className={styles.sites} aria-label={COPY.usageSitesLabel}>
    {usage.samples.length === 0 && (
      <li className={styles.none}>{COPY.usageNoSites}</li>
    )}
    {usage.samples.map((site) => (
      <TokenUsageSite key={`${site.file}:${site.line}`} site={site} />
    ))}
  </ul>
);

export { TokenUsageSites };
