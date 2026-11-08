import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { copy } from "./copy.js";
import {
  HealthDot,
  Icon,
  ProjectThumb,
  api,
  chordMatches,
  errorText,
  findElement,
  isDesktop,
  openProject,
  projectsApi,
  readStored,
  uiStore,
  useProjectHits,
  useRouteHits,
  writeStored,
} from "./deps.js";
import { globalCommands } from "./global-commands.js";
import { IS_MAC, Keys } from "./keys.js";
import { buildRows, typePair } from "./palette-rows.js";
import type { Row } from "./palette-rows.js";
import { collectCommands } from "./registry.js";

const RECENT_KEY = "design-studio.commands.recent.v1";
const RECENT_MAX = 5;
const DESKTOP = "window" in globalThis && isDesktop();

const readRecent = (): string[] => {
  try {
    const raw: unknown = JSON.parse(readStored(RECENT_KEY) ?? "[]");

    return Array.isArray(raw)
      ? raw
          .filter((id): id is string => typeof id === "string")
          .slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
};

const noteRecent = (id: string): void => {
  writeStored(
    RECENT_KEY,
    JSON.stringify(
      [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX)
    )
  );
};

const Marked = ({
  text,
  marks,
}: {
  text: string;
  marks: number[];
}): ReactNode => {
  if (marks.length === 0) {
    return text;
  }

  const set = new Set(marks);
  const out: ReactNode[] = [];
  let run = "";
  let on = false;

  const flush = (key: number): void => {
    if (run) {
      out.push(on ? <mark key={key}>{run}</mark> : run);
    }

    run = "";
  };

  [...text].forEach((ch, i) => {
    const hit = set.has(i);

    if (hit !== on) {
      flush(i);
      on = hit;
    }

    run += ch;
  });
  flush(text.length);

  return out;
};

const RowLead = ({ row }: { row: Row }): ReactElement => {
  if (row.hit && row.kind === "project" && !row.icon) {
    return <ProjectThumb hit={row.hit} />;
  }

  return (
    <span className="cmdk-icon" data-tone={row.tone} aria-hidden="true">
      <Icon name={row.icon ?? "dot"} size={14} />
    </span>
  );
};

const RowEnd = ({
  row,
  active,
  typing,
}: {
  row: Row;
  active: boolean;
  typing: boolean;
}): ReactElement => {
  const enter = typing && active && !row.disabled;

  return (
    <span className="cmdk-end">
      {row.disabled ? (
        <span className="cmdk-note">{row.disabled}</span>
      ) : (
        row.note && !enter && <span className="cmdk-note">{row.note}</span>
      )}
      {row.hit &&
        row.kind === "project" &&
        !row.icon &&
        row.hit.health?.level === "failed" && (
          <HealthDot hit={row.hit} className="cmdk-dot" />
        )}
      {row.hit && row.kind === "project" && !row.icon && (
        <span className="cmdk-type">{typePair(row.hit.type)}</span>
      )}
      {enter ? (
        <Keys keys="Enter" className="cmdk-keys" />
      ) : (
        row.keys && <Keys keys={row.keys} className="cmdk-keys" />
      )}
    </span>
  );
};

const stepOf = (event: ReactKeyboardEvent): number => {
  if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
    return 1;
  }

  if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
    return -1;
  }

  return 0;
};

const recentRowFor = (
  event: ReactKeyboardEvent,
  rows: Row[]
): Row | undefined =>
  rows.find(
    (row) =>
      row.group === "Recent" &&
      row.keys !== undefined &&
      chordMatches(row.keys, event.nativeEvent, IS_MAC)
  );

const usePaletteRows = (
  query: string,
  onShortcuts: () => void,
  onClose: () => void,
  setError: (error: string | null) => void
) => {
  const current = uiStore.get().activeProjectId;
  const hits = useProjectHits(current);
  const routes = useRouteHits(query, current, hits?.routes ?? []);
  const [recent] = useState(readRecent);

  const [commands] = useState(() => {
    const all = [...collectCommands(), ...globalCommands(onShortcuts)].filter(
      (c) => !c.id.startsWith("project.open.")
    );

    return all.filter((c, i) => all.findIndex((x) => x.id === c.id) === i);
  });

  const [busy, startTransition] = useTransition();

  const actions = useMemo(
    () => ({
      newPrototype: (prompt: string): void => {
        setError(null);
        startTransition(async () => {
          try {
            const { project } = await api.createProject({
              prompt,
              kind: "html",
            });

            void projectsApi.load();
            onClose();
            openProject(project.id);
          } catch (err) {
            setError(errorText(err));
          }
        });
      },
      openProject: (id: string, route?: string): void => {
        onClose();
        globalThis.setTimeout(() => openProject(id, route), 0);
      },
    }),
    [onClose, setError]
  );

  const rows = useMemo(
    () =>
      buildRows({
        actions,
        commands,
        current,
        desktop: DESKTOP,
        mac: IS_MAC,
        projects: hits?.projects ?? [],
        query,
        recent,
        routes,
      }),
    [query, commands, hits, routes, recent, current, actions]
  );

  return { busy, loading: hits === null, rows };
};

const Palette = ({
  onClose,
  onShortcuts,
}: {
  onClose: () => void;
  onShortcuts: () => void;
}): ReactElement => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const { rows, busy, loading } = usePaletteRows(
    query,
    onShortcuts,
    onClose,
    setError
  );

  const current = Math.min(active, Math.max(0, rows.length - 1));
  const typing = query.trim() !== "";

  useLayoutEffect(() => {
    if (listRef.current) {
      findElement(listRef.current, `[data-index="${current}"]`)?.scrollIntoView(
        {
          block: "nearest",
        }
      );
    }
  }, [current, rows]);

  const run = (row: Row | undefined): void => {
    if (!row || row.disabled || busy) {
      return;
    }

    if (row.commandId) {
      noteRecent(row.commandId);
    }

    if (row.kind === "new" || row.kind === "project" || row.kind === "route") {
      row.run();

      return;
    }

    onClose();
    globalThis.setTimeout(() => row.run(), 0);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    const step = stepOf(event);
    const recentRow = typing ? undefined : recentRowFor(event, rows);

    if (step !== 0 && rows.length > 0) {
      event.preventDefault();
      setActive((current + step + rows.length) % rows.length);
    } else if (recentRow) {
      event.preventDefault();
      event.stopPropagation();
      run(recentRow);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(rows[current]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (query) {
        setQuery("");
      } else {
        onClose();
      }
    }
  };

  let lastGroup = "";

  return (
    <div
      className="cmdk-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label={copy.palette}
        aria-busy={busy || undefined}
      >
        <div className="cmdk-search">
          {busy ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <Icon name="search" size={16} />
          )}
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              rows[current] ? `${listId}-${current}` : undefined
            }
            aria-autocomplete="list"
            aria-label={copy.paletteInput}
            placeholder={copy.paletteInput}
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setError(null);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="cmdk-esc">{copy.textEsc}</kbd>
        </div>
        {error && (
          <div className="cmdk-error" role="alert">
            <Icon name="alert" size={14} />
            <span>{error}</span>
          </div>
        )}
        <div
          className="cmdk-list"
          role="listbox"
          id={listId}
          ref={listRef}
          aria-label={copy.results}
        >
          {rows.length === 0 && (
            <p className="cmdk-empty">
              {loading ? "Loading projects…" : `Nothing matches “${query}”.`}
            </p>
          )}
          {rows.map((row, index) => {
            const head = row.group === lastGroup ? null : row.group;
            lastGroup = row.group;

            return (
              <div key={`${row.group}-${row.key}`} role="presentation">
                {head && (
                  <div className="cmdk-group" role="presentation">
                    {head}
                  </div>
                )}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === current}
                  aria-disabled={row.disabled ? true : undefined}
                  data-index={index}
                  data-kind={row.kind}
                  className="cmdk-row"
                  onMouseMove={() => index !== current && setActive(index)}
                  onClick={() => run(row)}
                >
                  <RowLead row={row} />
                  <span className="cmdk-title truncate">
                    <Marked text={row.title} marks={row.marks} />
                  </span>
                  {row.meta && (
                    <span className="cmdk-meta truncate">{row.meta}</span>
                  )}
                  <RowEnd
                    row={row}
                    active={index === current}
                    typing={typing}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <footer className="cmdk-foot" aria-hidden="true">
          <span>
            <kbd>{copy.textGlyph2}</kbd>
            <kbd>{copy.textGlyph3}</kbd> {copy.textMove}
          </span>
          <span>
            <kbd>{copy.textGlyph4}</kbd> {copy.textOpen}
          </span>
          <span>
            <kbd>{copy.textEsc}</kbd> {copy.textClose}
          </span>
          <span className="cmdk-foot-end">
            <Keys keys="?" /> {copy.textAllShortcuts}
          </span>
        </footer>
      </div>
    </div>
  );
};

export { Palette };
