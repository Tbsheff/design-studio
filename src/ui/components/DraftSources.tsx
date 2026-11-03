import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

import type {
  DraftSourceStatus,
  DraftSourcesState,
  Project,
  RunStatus,
} from "../../shared/contracts";
import { api } from "../api";
import { useProjectEvents } from "../events";
import { Icon } from "../kit/Icon";
import { packApi } from "../platform/pack-api";

type ImproveEnd = { runId: string; status: RunStatus } | null;

export function useDraftSources(
  projectId: string,
  enabled: boolean
): { state: DraftSourcesState | null; improveEnd: RunStatus | null } {
  const [state, setState] = useState<DraftSourcesState | null>(null);
  const [end, setEnd] = useState<ImproveEnd>(null);

  const runId =
    state?.improve.state === "started" ? (state.improve.runId ?? null) : null;

  useEffect(() => {
    if (!runId) {
      return;
    }

    let live = true;
    api
      .getRun(projectId, runId)
      .then(
        (run) =>
          live &&
          run.summary.status !== "running" &&
          setEnd({ runId, status: run.summary.status })
      )
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [projectId, runId]);
  useEffect(() => {
    setState(null);

    if (!enabled) {
      return;
    }

    let live = true;
    packApi
      .getDesignSystemDraft(projectId)
      .then((info) => live && setState((prev) => prev ?? info.sources ?? null))
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [projectId, enabled]);
  useProjectEvents(enabled ? projectId : null, (event) => {
    if (event.type === "design-system.sources") {
      setState(event.sources);
    }

    if (event.type === "run.finished" && event.runId === runId) {
      setEnd({ runId, status: event.summary.status });
    }
  });

  return { state, improveEnd: end && end.runId === runId ? end.status : null };
}

const KIND_ICON: Record<
  DraftSourceStatus["kind"],
  Parameters<typeof Icon>[0]["name"]
> = {
  url: "globe",
  "design-md": "doc",
  brief: "pencil",
  "tokens-file": "token",
  folder: "folder",
  images: "image",
};

const STATE_LABEL: Record<DraftSourceStatus["state"], string> = {
  queued: "Waiting",
  reading: "Reading",
  read: "Read",
  thin: "Little found",
  blocked: "Blocked",
  failed: "Failed",
};

function seconds(ms: number | undefined): string | null {
  if (ms === undefined) {
    return null;
  }

  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function StateMark({ state }: { state: DraftSourceStatus["state"] }) {
  if (state === "reading") {
    return <span className="spinner" aria-hidden="true" />;
  }

  if (state === "read") {
    return <Icon name="check" size={12} />;
  }

  if (state === "blocked" || state === "failed") {
    return <Icon name="alert" size={12} />;
  }

  return <span className="ds-src-dot" aria-hidden="true" />;
}

function SourceRow({ source }: { source: DraftSourceStatus }) {
  const time = seconds(source.ms);

  return (
    <li className="ds-src-row" data-state={source.state}>
      <span className="ds-src-kind" aria-hidden="true">
        <Icon name={KIND_ICON[source.kind]} size={14} />
      </span>
      <div className="ds-src-text">
        <div className="ds-src-line">
          <span className="ds-src-label truncate">{source.label}</span>
          <span className="ds-src-state" data-state={source.state}>
            <StateMark state={source.state} />
            {STATE_LABEL[source.state]}
          </span>
        </div>
        <p className="ds-src-detail">
          {source.detail}
          {source.method === "browser" && (
            <span className="ds-src-time"> · read in a browser</span>
          )}
          {time && source.state !== "reading" && (
            <span className="ds-src-time"> · {time}</span>
          )}
        </p>
        {source.note && <p className="ds-src-note-line">{source.note}</p>}
      </div>
    </li>
  );
}

function summary(state: DraftSourcesState): string {
  const real = state.sources.filter((source) => source.kind !== "images");

  const finished = real.filter(
    (source) => source.state !== "queued" && source.state !== "reading"
  ).length;

  if (!state.done) {
    return `Reading ${finished} of ${real.length}`;
  }

  const problems = real.filter(
    (source) => source.state === "blocked" || source.state === "failed"
  ).length;

  return problems > 0
    ? `${real.length - problems} of ${real.length} read`
    : "All read";
}

function startedNote(end: RunStatus | null): string {
  if (end === null || end === "running") {
    return "The AI step started. Follow its steps in the chat below.";
  }

  if (end === "completed") {
    return "AI step done. Its steps are in the chat below.";
  }

  if (end === "canceled") {
    return "The AI step was stopped. Use Improve with AI to run it again.";
  }

  return "The AI step did not finish. See the chat below, then use Improve with AI.";
}

function improveNote(
  state: DraftSourcesState,
  end: RunStatus | null
): string | null {
  if (!state.done) {
    return "When every source is read, the AI step starts by itself.";
  }

  if (state.improve.state === "done") {
    return startedNote(state.improve.status ?? "completed");
  }

  if (state.improve.state === "started") {
    return startedNote(end);
  }

  if (state.improve.state === "skipped") {
    return state.improve.reason ?? null;
  }

  return null;
}

const NEEDS_LOOK = new Set<DraftSourceStatus["state"]>([
  "thin",
  "blocked",
  "failed",
]);

export function DraftSources({
  state,
  improveEnd,
}: {
  state: DraftSourcesState | null;
  improveEnd: RunStatus | null;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (!state || state.sources.length === 0) {
    return null;
  }

  const note = improveNote(state, improveEnd);
  const full = open || !state.done;

  const rows = full
    ? state.sources
    : state.sources.filter(
        (source) =>
          NEEDS_LOOK.has(source.state) ||
          (source.kind === "tokens-file" && source.note !== undefined)
      );

  const shown = rows.length > 0;

  return (
    <section
      className="ds-sources"
      aria-label="Sources"
      aria-busy={!state.done}
    >
      <div className="ds-src-head">
        <strong>Sources</strong>
        <span className="ds-src-summary" role="status">
          {!state.done && <span className="spinner" aria-hidden="true" />}
          {summary(state)}
        </span>
        {state.done && (
          <button
            type="button"
            className="icon-btn small ds-src-toggle"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={open ? "Show only problems" : "Show all sources"}
            data-tip={open ? "Show only problems" : "Show all sources"}
            data-tip-align="end"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
          </button>
        )}
      </div>
      {shown && (
        <ul className="ds-src-list" id={listId}>
          {rows.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </ul>
      )}
      {note && <p className="ds-src-note">{note}</p>}
    </section>
  );
}

export interface DraftChrome {
  banner: ReactNode;
  reading: boolean;
  waitReason: string | null;
  locked: (running: boolean) => boolean;
  unfinished: (visible: boolean) => boolean;
}

export function useDraftChrome(
  projectId: string,
  project: Project | null
): DraftChrome {
  const backing = Boolean(project?.designSystemFor);
  const { state, improveEnd } = useDraftSources(projectId, backing);
  const reading = state !== null && !state.done;

  return {
    banner: backing ? (
      <DraftSources state={state} improveEnd={improveEnd} />
    ) : null,
    reading,
    waitReason: reading ? "Wait for the sources to finish reading..." : null,
    locked: (running) => running || reading,
    unfinished: (visible) => visible && !reading,
  };
}
