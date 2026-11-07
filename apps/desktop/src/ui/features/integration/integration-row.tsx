import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { IntegrationDelete } from "./integration-delete.js";
import { toToolCount } from "./integration-model.js";
import type { IntegrationItem } from "./integration-model.js";
import { IntegrationStatus } from "./integration-status.js";
import { IntegrationTools } from "./integration-tools.js";

import styles from "./integration.module.css";

interface IntegrationRowProps {
  readonly isBusy: boolean;
  readonly item: IntegrationItem;
  readonly onAllow: (id: string, tools: readonly string[]) => void;
  readonly onDelete: (id: string) => void;
  readonly onEnabled: (id: string, isEnabled: boolean) => void;
  readonly onTest: (id: string) => void;
}

const IntegrationRow = ({
  isBusy,
  item,
  onAllow,
  onDelete,
  onEnabled,
  onTest,
}: IntegrationRowProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTest = useCallback(
    (): void => onTest(item.id),
    [item.id, onTest]
  );

  const handleToggle = useCallback((): void => setIsOpen((prev) => !prev), []);

  const handleEnabled = useCallback(
    (): void => onEnabled(item.id, !item.isEnabled),
    [item.id, item.isEnabled, onEnabled]
  );

  let enabledLabel: string = copy.disabled;
  let toolsLabel: string = copy.toolsShow;

  if (item.isEnabled) {
    enabledLabel = copy.enabled;
  }

  if (isOpen) {
    toolsLabel = copy.toolsHide;
  }

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.tag}>{item.transport}</span>
        <IntegrationStatus item={item} />
        <span className={styles.meta}>{`${toToolCount(item)} tools`}</span>
      </div>
      {item.statusMessage !== null && (
        <span className={styles.error}>{item.statusMessage}</span>
      )}
      <div className={styles.actions}>
        <button
          aria-pressed={item.isEnabled}
          className={styles.small}
          disabled={isBusy}
          onClick={handleEnabled}
          type="button"
        >
          {enabledLabel}
        </button>
        <button
          className={styles.small}
          data-tip={copy.testTip}
          disabled={isBusy}
          onClick={handleTest}
          type="button"
        >
          {copy.test}
        </button>
        <button
          aria-expanded={isOpen}
          className={styles.small}
          onClick={handleToggle}
          type="button"
        >
          {toolsLabel}
        </button>
        <IntegrationDelete id={item.id} isBusy={isBusy} onDelete={onDelete} />
      </div>
      {isOpen && (
        <IntegrationTools isBusy={isBusy} item={item} onAllow={onAllow} />
      )}
    </li>
  );
};

export { IntegrationRow };
