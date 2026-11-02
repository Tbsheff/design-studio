import { useCallback, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { TextHit } from "./deps.js";
import { FindFields } from "./find-fields.js";
import { FindStatus } from "./find-status.js";
import { ResultGroup } from "./result-group.js";
import type { FindHost } from "./use-find-host.js";
import { useTextSearch } from "./use-text-search.js";

import styles from "./text-search.module.css";

interface FindPanelProps {
  readonly directionId: string;
  readonly host: FindHost;
  readonly projectId: string;
}

const FindPanel = ({
  directionId,
  host,
  projectId,
}: FindPanelProps): ReactElement => {
  const state = useTextSearch({ directionId, projectId });
  const { replaceOne, setActiveId } = state;
  const { close, reveal } = host;
  const isBusy = state.isReplacing || state.query.trim() === "";

  const handlePick = useCallback(
    (hit: TextHit): void => {
      setActiveId(hit.id);
      reveal(hit);
    },
    [reveal, setActiveId]
  );

  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const panel = panelRef.current;

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    panel?.addEventListener("keydown", handleEscape);

    return (): void => {
      panel?.removeEventListener("keydown", handleEscape);
    };
  }, [close]);

  return (
    <aside className={styles.panel} aria-label={copy.title} ref={panelRef}>
      <header className={styles.head}>
        <h2 className={styles.title}>{copy.title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label={copy.close}
          data-tip={copy.close}
          onClick={close}
        >
          {copy.closeGlyph}
        </button>
      </header>
      <FindFields state={state} />
      <FindStatus state={state} />
      <ul className={styles.groups}>
        {state.groups.map((group) => (
          <ResultGroup
            key={group.key}
            activeId={state.activeId}
            frameName={host.frameName(group.frame)}
            group={group}
            isBusy={isBusy}
            onPick={handlePick}
            onReplace={replaceOne}
          />
        ))}
      </ul>
    </aside>
  );
};

export { FindPanel };
