import type { ReactElement } from "react";

import { PatternDeleteControls } from "./pattern-delete-controls.js";
import { PatternInsertControls } from "./pattern-insert-controls.js";
import { toMeta } from "./pattern-model.js";
import type {
  PatternItem,
  PatternPosition,
  PatternTarget,
} from "./pattern-model.js";
import { PatternPageControls } from "./pattern-page-controls.js";

import styles from "./pattern.module.css";

interface PatternRowProps {
  readonly canPage: boolean;
  readonly isBusy: boolean;
  readonly item: PatternItem;
  readonly onDelete: (patternId: string) => void;
  readonly onInsert: (
    patternId: string,
    position: PatternPosition,
    target: PatternTarget
  ) => void;
  readonly onPage: (patternId: string, page: string) => void;
  readonly target: PatternTarget | null;
}

const PatternRow = ({
  canPage,
  isBusy,
  item,
  onDelete,
  onInsert,
  onPage,
  target,
}: PatternRowProps): ReactElement => (
  <li className={styles.row}>
    <div className={styles.rowMain}>
      <span className={styles.name}>{item.name}</span>
      <span className={styles.meta}>{toMeta(item)}</span>
    </div>
    <div className={styles.actions}>
      {item.tags.map((tag) => (
        <span className={styles.tag} key={tag}>
          {tag}
        </span>
      ))}
    </div>
    <PatternInsertControls
      isBusy={isBusy}
      onInsert={onInsert}
      patternId={item.id}
      target={target}
    />
    {canPage && (
      <PatternPageControls
        isBusy={isBusy}
        onPage={onPage}
        patternId={item.id}
      />
    )}
    <PatternDeleteControls
      isBusy={isBusy}
      onDelete={onDelete}
      patternId={item.id}
    />
  </li>
);

export { PatternRow };
