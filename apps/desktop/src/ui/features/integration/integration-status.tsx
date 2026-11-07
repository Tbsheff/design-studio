import type { ReactElement } from "react";

import { toStatusText } from "./integration-model.js";
import type { IntegrationItem } from "./integration-model.js";

import styles from "./integration.module.css";

interface IntegrationStatusProps {
  readonly item: IntegrationItem;
}

const IntegrationStatus = ({ item }: IntegrationStatusProps): ReactElement => (
  <span className={styles.status} data-status={item.status}>
    {toStatusText(item)}
  </span>
);

export { IntegrationStatus };
