import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { IntegrationItem } from "./integration-model.js";

import styles from "./integration.module.css";

interface IntegrationToolRowProps {
  readonly allowed: readonly string[];
  readonly id: string;
  readonly isBusy: boolean;
  readonly onAllow: (id: string, tools: readonly string[]) => void;
  readonly tool: IntegrationItem["tools"][number];
}

const IntegrationToolRow = ({
  allowed,
  id,
  isBusy,
  onAllow,
  tool,
}: IntegrationToolRowProps): ReactElement => {
  const isAllowed = allowed.includes(tool.name);

  const handleToggle = useCallback((): void => {
    if (isAllowed) {
      onAllow(
        id,
        allowed.filter((name) => name !== tool.name)
      );

      return;
    }

    onAllow(id, [...allowed, tool.name]);
  }, [allowed, id, isAllowed, onAllow, tool.name]);

  return (
    <li className={styles.toolRow}>
      <label className={styles.toolLabel} data-tip={copy.allowTip}>
        <input
          checked={isAllowed}
          disabled={isBusy}
          onChange={handleToggle}
          type="checkbox"
        />
        <span className={styles.name}>{tool.name}</span>
      </label>
      <span className={styles.meta}>{tool.description}</span>
    </li>
  );
};

export { IntegrationToolRow };
