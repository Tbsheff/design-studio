import { BrandMark, Icon } from "@design-studio/ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { TYPE_LABELS } from "../../../shared/project-search.js";
import { openProject } from "../../app/project-nav.js";
import { readStored, writeStored } from "../../platform/storage.js";
import { IS_MAC, tipWithKey } from "../commands/keys.js";
import { useCommands } from "../commands/registry.js";
import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import {
  noteProjectOpened,
  refreshProjectHits,
  useProjectHits,
} from "./project-hits-model.js";
import { HealthDot, ProjectThumb } from "./project-thumb.js";

import "../../styles/project-nav.css";

const KEY = "design-studio.rail.v1";
const MINI_MAX = 8;

const GROUPS: {
  readonly title: string;
  readonly test: (hit: ProjectHit) => boolean;
}[] = [
  { test: (hit) => hit.type === "next" || hit.type === "vite", title: "Apps" },
  {
    test: (hit) => hit.type === "html" || hit.type === "react",
    title: "Prototypes",
  },
  { test: (hit) => hit.type === "design-system", title: "Design systems" },
];

type RailState = "open" | "mini";

const listeners = new Set<() => void>();

function readRail(): RailState {
  return readStored(KEY) === "open" ? "open" : "mini";
}

let railState: RailState = readRail();

const setRail = (next: RailState): void => {
  railState = next;

  writeStored(KEY, next);

  for (const listener of listeners) {
    listener();
  }
};

const toggleRail = (): void => {
  setRail(railState === "open" ? "mini" : "open");
};

const useRail = (): RailState =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    () => railState
  );

const OVERLAY_QUERY = "(max-width: 1279px)";

function floating(): boolean {
  return globalThis.matchMedia(OVERLAY_QUERY).matches;
}

function pickProject(id: string): void {
  if (railState === "open" && floating()) {
    setRail("mini");
  }

  openProject(id);
}

function useFloatingDismiss(
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (state !== "open") {
      return;
    }

    const close = () => floating() && setRail("mini");

    const onPointer = (event: PointerEvent) => {
      if (!rail.current?.contains(event.target as Node)) {
        close();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        close();
      }
    };

    globalThis.addEventListener("pointerdown", onPointer, true);
    globalThis.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);

    return () => {
      globalThis.removeEventListener("pointerdown", onPointer, true);
      globalThis.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [state, rail]);
}

function moveFocus(event: ReactKeyboardEvent<HTMLElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(".prail-item"),
  ];

  const at = items.indexOf(document.activeElement as HTMLElement);

  if (at === -1 && !(document.activeElement instanceof HTMLInputElement)) {
    return;
  }

  event.preventDefault();

  const next =
    at === -1
      ? 0
      : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
        items.length;

  items[next]?.focus();
}

function useStageFocusOnClose(
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void {
  const last = useRef(state);
  useEffect(() => {
    const closed = last.current === "open" && state !== "open";
    last.current = state;

    if (!closed) {
      return;
    }

    const active = document.activeElement;

    if (active && active !== document.body && !rail.current?.contains(active)) {
      return;
    }

    document
      .querySelector<HTMLElement>(".canvas .stage")
      ?.focus({ preventScroll: true });
  }, [state, rail]);
}

function useRailKeys(onOpened: () => void): void {
  const opened = useRef(onOpened);
  opened.current = onOpened;
  useCommands(() => [
    {
      group: "View",
      icon: "sidebar",
      id: "view.project-rail",
      keyId: "project-rail",
      keywords: "projects switch sidebar recent",
      run: () => toggleRail(),
      title: "Show or hide the project rail",
    },
  ]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !matchesKey("project-rail", event, IS_MAC)
      ) {
        return;
      }

      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      event.preventDefault();
      toggleRail();

      if (railState === "open") {
        globalThis.requestAnimationFrame(() => opened.current());
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);
}

interface RailProps {
  readonly projectId: string;
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
}

const KIND_LABEL = TYPE_LABELS;

function tipOf(hit: ProjectHit, current: boolean): string {
  const parts = [hit.name, KIND_LABEL[hit.type], hit.health?.note].filter(
    Boolean
  );

  return current ? `${parts.join(" · ")} (open)` : parts.join(" · ");
}

const MiniRail = ({
  hits,
  projectId,
  onNewPrototype,
}: {
  readonly hits: ProjectHit[];
  readonly projectId: string;
  readonly onNewPrototype: () => void;
}) => {
  const top = hits.slice(0, MINI_MAX);
  const current = hits.find((hit) => hit.id === projectId);

  const shown =
    current && !top.includes(current)
      ? [...top.slice(0, MINI_MAX - 1), current]
      : top;

  return (
    <>
      <div className="prail-top">
        <BrandMark />
      </div>
      <nav className="prail-thumbs" aria-label={copy.recentProjects}>
        {shown.map((hit) => (
          <button
            key={hit.id}
            type="button"
            className="prail-item prail-mini"
            aria-current={hit.id === projectId ? "page" : undefined}
            aria-label={tipOf(hit, hit.id === projectId)}
            data-tip={tipOf(hit, hit.id === projectId)}
            data-tip-align="start"
            onClick={() => pickProject(hit.id)}
          >
            <ProjectThumb hit={hit} />
            <HealthDot hit={hit} className="prail-mini-dot" />
          </button>
        ))}
      </nav>
      <div className="prail-foot">
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.newPrototype}
          data-tip={copy.newPrototype}
          data-tip-side="top"
          data-tip-align="start"
          onClick={onNewPrototype}
        >
          <Icon name="plus" size={14} />
        </button>
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.showProjects}
          aria-expanded="false"
          data-tip={tipWithKey("Show projects", "project-rail")}
          data-tip-side="top"
          data-tip-align="start"
          onClick={() => setRail("open")}
        >
          <Icon name="sidebar" size={14} />
        </button>
      </div>
    </>
  );
};

const RailRow = ({
  hit,
  isCurrent,
}: {
  readonly hit: ProjectHit;
  readonly isCurrent: boolean;
}) => (
  <button
    type="button"
    className="prail-item prail-row"
    aria-current={isCurrent ? "page" : undefined}
    data-tip={
      hit.health
        ? `${KIND_LABEL[hit.type]} · ${hit.health.note}`
        : KIND_LABEL[hit.type]
    }
    data-tip-align="start"
    onClick={() => pickProject(hit.id)}
  >
    <ProjectThumb hit={hit} />
    <span className="truncate">{hit.name}</span>
    <HealthDot hit={hit} />
  </button>
);

const OpenRail = ({
  hits,
  projectId,
  onHome,
  onNewPrototype,
  find,
}: {
  readonly hits: ProjectHit[];
  readonly projectId: string;
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
  readonly find: RefObject<HTMLInputElement | null>;
}) => {
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    return needle
      ? hits.filter((hit) =>
          `${hit.name} ${hit.place ?? ""}`.toLowerCase().includes(needle)
        )
      : hits;
  }, [hits, filter]);

  return (
    <>
      <div className="prail-head">
        <BrandMark />
        <span className="prail-title">{copy.projects}</span>
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.collapseProjects}
          aria-expanded="true"
          data-tip={tipWithKey("Collapse", "project-rail")}
          data-tip-align="end"
          onClick={() => setRail("mini")}
        >
          <Icon name="sidebar" size={14} />
        </button>
      </div>
      <div className="prail-find">
        <Icon name="search" size={12} />
        <input
          ref={find}
          value={filter}
          placeholder={copy.find}
          aria-label={copy.findAProject}
          spellCheck={false}
          onChange={(eventArg) => setFilter(eventArg.target.value)}
          onKeyDown={(eventNext) => {
            const first = shown[0];

            if (
              eventNext.key === "Enter" &&
              first &&
              !eventNext.nativeEvent.isComposing
            ) {
              pickProject(first.id);
            } else if (eventNext.key === "Escape" && filter) {
              eventNext.preventDefault();
              eventNext.stopPropagation();
              setFilter("");
            }
          }}
        />
      </div>
      <nav className="prail-list" aria-label={copy.projects}>
        {GROUPS.map((group) => {
          const items = shown.filter(group.test);

          if (items.length === 0) {
            return null;
          }

          return (
            <div
              key={group.title}
              className="prail-group"
              role="group"
              aria-label={group.title}
            >
              <div className="prail-group-head">{group.title}</div>
              {items.map((hit) => (
                <RailRow
                  key={hit.id}
                  hit={hit}
                  isCurrent={hit.id === projectId}
                />
              ))}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="prail-empty">
            {filter ? "No project matches." : "Loading projects…"}
          </p>
        )}
      </nav>
      <div className="prail-foot">
        <button type="button" className="btn small" onClick={onNewPrototype}>
          <Icon name="plus" size={12} />
          {copy.newPrototype}
        </button>
        <button type="button" className="btn small ghost" onClick={onHome}>
          <Icon name="arrowLeft" size={12} />
          {copy.allProjects}
        </button>
      </div>
    </>
  );
};

const ProjectRail = ({ projectId, onHome, onNewPrototype }: RailProps) => {
  const state = useRail();
  const result = useProjectHits(projectId, false);
  const find = useRef<HTMLInputElement>(null);
  const aside = useRef<HTMLElement>(null);
  useRailKeys(() => find.current?.focus());
  useFloatingDismiss(state, aside);
  useStageFocusOnClose(state, aside);
  useEffect(() => {
    if (
      state === "open" &&
      document.activeElement instanceof HTMLIFrameElement
    ) {
      find.current?.focus();
    }
  }, [state]);
  useEffect(() => noteProjectOpened(projectId), [projectId]);
  useEffect(() => {
    const onFocus = () => refreshProjectHits(projectId);
    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [projectId]);
  const hits = result?.projects ?? [];

  return (
    <aside
      ref={aside}
      className="prail"
      data-state={state}
      aria-label={copy.projectRail}
      onKeyDown={moveFocus}
    >
      {state === "open" ? (
        <OpenRail
          hits={hits}
          projectId={projectId}
          onHome={onHome}
          onNewPrototype={onNewPrototype}
          find={find}
        />
      ) : (
        <MiniRail
          hits={hits}
          projectId={projectId}
          onNewPrototype={onNewPrototype}
        />
      )}
    </aside>
  );
};

export { ProjectRail, setRail, toggleRail, useRail };
