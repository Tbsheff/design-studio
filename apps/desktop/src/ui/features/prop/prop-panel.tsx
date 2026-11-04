import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PropMakeForm } from "./prop-make-form.js";
import type { PropLayer, PropTarget } from "./prop-model.js";
import { PropRow } from "./prop-row.js";
import { usePropEdit } from "./use-prop-edit.js";
import { usePropList } from "./use-prop-list.js";

import styles from "./prop.module.css";

interface PropPanelProps {
  readonly layer: PropLayer | null;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly target: PropTarget;
}

const PropPanel = ({
  layer,
  onClose,
  onDone,
  target,
}: PropPanelProps): ReactElement => {
  const list = usePropList(target);
  const edit = usePropEdit({ layer, onDone, target });
  const error = edit.error ?? list.error;

  return (
    <section aria-label={copy.title} className={styles.panel}>
      <div className={styles.head}>
        <strong className={styles.title}>{target.component}</strong>
        <button className={styles.small} onClick={onClose} type="button">
          {copy.close}
        </button>
      </div>
      {list.rows.length === 0 && !list.isLoading && (
        <p className={styles.note}>{copy.empty}</p>
      )}
      <ul className={styles.list}>
        {list.rows.map((row) => (
          <PropRow
            isBusy={edit.isBusy}
            key={row.name}
            onDelete={edit.handleDelete}
            onRename={edit.handleRename}
            row={row}
          />
        ))}
      </ul>
      {layer !== null && (
        <PropMakeForm
          isBusy={edit.isBusy}
          layer={layer}
          onCreate={edit.handleCreate}
        />
      )}
      <span className={styles.error} role="alert">
        {error}
      </span>
      {edit.message !== null && <p className={styles.note}>{edit.message}</p>}
    </section>
  );
};

export { PropPanel };

export type { PropPanelProps };
