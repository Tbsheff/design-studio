import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { IntegrationForm } from "./integration-form.js";
import type { IntegrationDraft } from "./integration-model.js";
import { IntegrationRow } from "./integration-row.js";
import { useIntegrationActions } from "./use-integration-actions.js";
import { useIntegrationList } from "./use-integration-list.js";

import styles from "./integration.module.css";

const IntegrationPanel = (): ReactElement => {
  const list = useIntegrationList();
  const actions = useIntegrationActions();
  const [isAdding, setIsAdding] = useState(false);
  const { handleCreate } = actions;
  const handleOpen = useCallback((): void => setIsAdding(true), []);
  const handleClose = useCallback((): void => setIsAdding(false), []);

  const handleSave = useCallback(
    (draft: IntegrationDraft): void => handleCreate(draft, handleClose),
    [handleClose, handleCreate]
  );

  return (
    <section aria-label={copy.title} className={styles.panel}>
      <div className={styles.head}>
        <h3 className={styles.title}>{copy.title}</h3>
        {!isAdding && (
          <button className={styles.small} onClick={handleOpen} type="button">
            {copy.add}
          </button>
        )}
      </div>
      <p className={styles.note}>{copy.intro}</p>
      {isAdding && (
        <IntegrationForm
          isBusy={actions.isBusy}
          onCancel={handleClose}
          onCreate={handleSave}
        />
      )}
      {!list.isLoading && list.items.length === 0 && (
        <p className={styles.note}>{copy.empty}</p>
      )}
      <ul className={styles.list}>
        {list.items.map((item) => (
          <IntegrationRow
            isBusy={actions.isBusy}
            item={item}
            key={item.id}
            onAllow={actions.handleAllow}
            onDelete={actions.handleDelete}
            onEnabled={actions.handleEnabled}
            onTest={actions.handleTest}
          />
        ))}
      </ul>
      {(list.error ?? actions.error) !== null && (
        <p className={styles.error} role="alert">
          {list.error ?? actions.error ?? copy.failed}
        </p>
      )}
    </section>
  );
};

export { IntegrationPanel };
