import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { ProjectKind, SelectionContext } from "./deps.js";
import { toTarget } from "./pattern-model.js";
import { PatternResult } from "./pattern-result.js";
import { PatternRow } from "./pattern-row.js";
import { usePatternActions } from "./use-pattern-actions.js";
import { usePatternList } from "./use-pattern-list.js";

import styles from "./pattern.module.css";

interface PatternPanelProps {
  readonly directionId: string | null;
  readonly kind: ProjectKind | undefined;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[] | undefined;
}

const PatternPanel = ({
  directionId,
  kind,
  projectId,
  selection,
}: PatternPanelProps): ReactElement => {
  const [query, setQuery] = useState("");
  const list = usePatternList(query);
  const actions = usePatternActions({ directionId, projectId });
  const first = selection?.[0] ?? null;
  const target = useMemo(() => toTarget(first), [first]);
  const error = actions.error ?? list.error;
  const isEmpty = list.total === 0 && !list.isLoading;

  const handleQuery = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setQuery(event.target.value),
    []
  );

  return (
    <section aria-label={copy.panelTitle} className={styles.panel}>
      <input
        aria-label={copy.searchLabel}
        className={styles.input}
        onChange={handleQuery}
        placeholder={copy.searchPlaceholder}
        type="search"
        value={query}
      />
      {isEmpty && <p className={styles.note}>{copy.empty}</p>}
      {!isEmpty && list.items.length === 0 && !list.isLoading && (
        <p className={styles.note}>{copy.noMatch}</p>
      )}
      <ul className={styles.list}>
        {list.items.map((item) => (
          <PatternRow
            canPage={kind === "react" && directionId !== null}
            isBusy={actions.isBusy || directionId === null}
            item={item}
            key={item.id}
            onDelete={actions.handleDelete}
            onInsert={actions.handleInsert}
            onPage={actions.handlePage}
            target={target}
          />
        ))}
      </ul>
      {actions.result !== null && <PatternResult result={actions.result} />}
      <span className={styles.error} role="alert">
        {error}
      </span>
    </section>
  );
};

export { PatternPanel };

export type { PatternPanelProps };
