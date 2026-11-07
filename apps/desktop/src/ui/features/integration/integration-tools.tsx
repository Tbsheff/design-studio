import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { IntegrationItem } from "./integration-model.js";
import { IntegrationToolRow } from "./integration-tool-row.js";

import styles from "./integration.module.css";

interface IntegrationToolsProps {
  readonly isBusy: boolean;
  readonly item: IntegrationItem;
  readonly onAllow: (id: string, tools: readonly string[]) => void;
}

const IntegrationTools = ({
  isBusy,
  item,
  onAllow,
}: IntegrationToolsProps): ReactElement => {
  if (item.tools.length === 0) {
    return <p className={styles.note}>{copy.allowNone}</p>;
  }

  return (
    <ul aria-label={copy.allowBox} className={styles.tools}>
      {item.tools.map((tool) => (
        <IntegrationToolRow
          allowed={item.allowedTools}
          id={item.id}
          isBusy={isBusy}
          key={tool.name}
          onAllow={onAllow}
          tool={tool}
        />
      ))}
    </ul>
  );
};

export { IntegrationTools };
