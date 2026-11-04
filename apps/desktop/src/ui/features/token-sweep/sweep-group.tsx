import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SweepGroup as Group } from "./sweep-model.js";
import { SweepRow } from "./sweep-row.js";

import styles from "./token-sweep.module.css";

interface SweepGroupProps {
  readonly group: Group;
  readonly onToggle: (id: string) => void;
  readonly selected: ReadonlySet<string>;
}

const SweepGroup = ({
  group,
  onToggle,
  selected,
}: SweepGroupProps): ReactElement => (
  <section className={styles.group}>
    <h4 className={styles.head}>
      {copy.groups[group.kind]}
      <span className={styles.count}>{group.changes.length}</span>
    </h4>
    <ul className={styles.list}>
      {group.changes.map((change) => (
        <SweepRow
          change={change}
          isChecked={selected.has(change.id)}
          key={change.id}
          onToggle={onToggle}
        />
      ))}
    </ul>
  </section>
);

export { SweepGroup };
