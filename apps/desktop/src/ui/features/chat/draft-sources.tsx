import type {
  DraftSourceStatus,
  DraftSourcesState,
  Project,
  RunStatus,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useId, useState, startTransition } from "react";
import type { ReactElement, ReactNode } from "react";

import { api } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { packApi } from "../../platform/pack-api.js";
import { copy } from "./copy.js";

const MS_PER_SECOND = 1000;

type ImproveEnd = { runId: string; status: RunStatus } | null;

const useDraftSources = (
  projectId: string,
  enabled: boolean
): { state: DraftSourcesState | null; improveEnd: RunStatus | null } => {
  const [state, setState] = useState<DraftSourcesState | null>(null);
  const [end, setEnd] = useState<ImproveEnd>(null);

  let runId: string | null = null;

  if (state?.improve.state === "started") {
    runId = state.improve.runId ?? null;
  }

  useEffect(() => {
    if (!runId) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const run = await api.getRun(projectId, runId);

        if (live && run.summary.status !== "running") {
          setEnd({ runId, status: run.summary.status });
        }
      } catch {
        return;
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, runId]);
  useEffect(() => {
    setState(null);

    if (!enabled) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const info = await packApi.getDesignSystemDraft(projectId);

        if (live) {
          setState((prev) => prev ?? info.sources ?? null);
        }
      } catch {
        return;
      }
    });

    return (): void => {
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

  return { improveEnd: end && end.runId === runId ? end.status : null, state };
};

const KIND_ICON: Record<
  DraftSourceStatus["kind"],
  Parameters<typeof Icon>[0]["name"]
> = {
  brief: "pencil",
  "design-md": "doc",
  folder: "folder",
  images: "image",
  "tokens-file": "token",
  url: "globe",
};

const STATE_LABEL: Record<DraftSourceStatus["state"], string> = {
  blocked: "Blocked",
  failed: "Failed",
  queued: "Waiting",
  read: "Read",
  reading: "Reading",
  thin: "Little found",
};

const seconds = (ms: number | undefined): string | null => {
  if (ms === undefined) {
    return null;
  }

  if (ms < MS_PER_SECOND) {
    return `${ms} ms`;
  }

  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
};

const StateMark = ({
  state,
}: {
  state: DraftSourceStatus["state"];
}): ReactElement => {
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
};

const SourceRow = ({ source }: { source: DraftSourceStatus }): ReactElement => {
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
            <span className="ds-src-time">{copy.readInABrowser}</span>
          )}
          {time && source.state !== "reading" && (
            <span className="ds-src-time">
              {copy.text}
              {time}
            </span>
          )}
        </p>
        {source.note && <p className="ds-src-note-line">{source.note}</p>}
      </div>
    </li>
  );
};

const summary = (state: DraftSourcesState): string => {
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

  if (problems > 0) {
    return `${real.length - problems} of ${real.length} read`;
  }

  return "All read";
};

const startedNote = (end: RunStatus | null): string => {
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
};

const improveNote = (
  state: DraftSourcesState,
  end: RunStatus | null
): string | null => {
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
};

const NEEDS_LOOK = new Set<DraftSourceStatus["state"]>([
  "thin",
  "blocked",
  "failed",
]);

const DraftSources = ({
  state,
  improveEnd,
}: {
  state: DraftSourcesState | null;
  improveEnd: RunStatus | null;
}): ReactElement | null => {
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
      aria-label={copy.sources}
      aria-busy={!state.done}
    >
      <div className="ds-src-head">
        <strong>{copy.sources}</strong>
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
};

interface DraftChrome {
  banner: ReactNode;
  reading: boolean;
  waitReason: string | null;
  locked: (running: boolean) => boolean;
  unfinished: (visible: boolean) => boolean;
}

const useDraftChrome = (
  projectId: string,
  project: Project | null
): DraftChrome => {
  const backing = Boolean(project?.designSystemFor);
  const { state, improveEnd } = useDraftSources(projectId, backing);
  const reading = state !== null && !state.done;

  return {
    banner: backing ? (
      <DraftSources state={state} improveEnd={improveEnd} />
    ) : null,
    locked: (running) => running || reading,
    reading,
    unfinished: (visible) => visible && !reading,
    waitReason: reading ? "Wait for the sources to finish reading..." : null,
  };
};

export { DraftSources, useDraftChrome, useDraftSources };

export type { DraftChrome };
