import type {
  DesignSystemState,
  Project,
  CoverageGrade,
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";
import { useFitPopover } from "@design-studio/ui";
import { useId, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { errorText } from "../../api.js";
import { packApi } from "../../platform/pack-api.js";
import { findPack, usePacks } from "../design-system/packs.js";
import { copy } from "./copy.js";
import { improvePassed, CheckStatus } from "./draft-improve.js";
import type { RunView } from "./run-state-model.js";

interface Props {
  project: Project;
  state: DesignSystemState | null;
  lastChange: unknown;
  onSave: (name: string, packId: string, force?: boolean) => Promise<void>;
  improve?: ReactNode;
  lastRun?: RunView | null;
  reading?: boolean;
  running?: boolean;
}

interface DraftInfoState {
  coverage: DesignSystemCoverage | null;
  check: DesignSystemCheckResult | null;
  error: string | null;
}

const useDraftInfo = (
  projectId: string | null,
  lastChange: unknown,
  runStatus: string | undefined
): DraftInfoState => {
  const [state, setState] = useState<DraftInfoState>({
    check: null,
    coverage: null,
    error: null,
  });

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let live = true;
    packApi
      .getDesignSystemDraft(projectId)
      .then(
        (info) =>
          live &&
          setState({ check: info.check, coverage: info.coverage, error: null })
      )
      .catch(
        (error) =>
          live &&
          setState({ check: null, coverage: null, error: errorText(error) })
      );

    return (): void => {
      live = false;
    };
  }, [projectId, lastChange, runStatus]);

  return state;
};

const GRADE_LABELS: Record<CoverageGrade, string> = {
  excellent: "Excellent",
  "needs-review": "Needs review",
  rebuild: "Rebuild",
  usable: "Usable",
};

const cssVarOf = (token: string): string => {
  const [group, name] = token.split(".");

  return group === "color" ? `--${name}` : `--${group}-${name}`;
};

const Fallbacks = ({ tokens }: { tokens: string[] }): ReactElement => {
  if (tokens.length === 0) {
    return <span className="draft-fallbacks">No fallback tokens</span>;
  }

  return (
    <span
      className="draft-fallbacks"
      data-tip={`From base: ${tokens.map(cssVarOf).join(", ")}`}
      data-tip-align="start"
    >
      {tokens.length} from base
      <span className="sr-only">: {tokens.map(cssVarOf).join(", ")}</span>
    </span>
  );
};

const KEY_TOKENS = ["color.bg", "color.fg", "color.primary", "font.body"];

const guessedKeys = (coverage: DesignSystemCoverage): string[] | null => {
  if (
    !coverage.tokens.some(
      (entry) => entry.source === "folder" || entry.source === "tokens-file"
    )
  ) {
    return null;
  }

  return KEY_TOKENS.filter(
    (token) =>
      coverage.tokens.find((entry) => entry.token === token)?.verified !== true
  );
};

const Guessed = ({
  coverage,
}: {
  coverage: DesignSystemCoverage;
}): ReactElement | null => {
  const keys = guessedKeys(coverage);

  if (keys === null) {
    return null;
  }

  if (keys.length === 0) {
    return <span className="draft-fallbacks">Key tokens checked</span>;
  }

  const names = keys.map(cssVarOf).join(", ");

  return (
    <span
      className="draft-fallbacks"
      data-tip={`Not found under their usual names in the source, so these are guesses: ${names}`}
      data-tip-align="start"
    >
      {keys.length} guessed
      <span className="sr-only">: {names}</span>
    </span>
  );
};

const DraftSummary = ({
  name,
  coverage,
  check,
  run,
  error,
}: {
  name: string;
  coverage: DesignSystemCoverage | null;
  check: DesignSystemCheckResult | null;
  run: RunView | null;
  error: string | null;
}): ReactElement => (
  <div className="draft-main">
    <strong className="truncate">{name}</strong>
    {coverage && (
      <span
        className="draft-grade"
        aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}`}
      >
        Coverage {coverage.score}/100 · {GRADE_LABELS[coverage.grade]}
      </span>
    )}
    {coverage && <Fallbacks tokens={coverage.fallbacks} />}
    {coverage && <Guessed coverage={coverage} />}
    <CheckStatus check={check} run={run} />
    {error && (
      <span className="draft-fallbacks">Could not load coverage. {error}</span>
    )}
  </div>
);

const SaveAnyway = ({
  count,
  busy,
  onSave,
}: {
  count: number;
  busy: boolean;
  onSave: () => void;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const popId = useId();
  useFitPopover(popRef, toggleRef, open);
  useEffect(() => {
    if (!open) {
      return;
    }

    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      setOpen(false);
      toggleRef.current?.focus();
    };

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (
        !popRef.current?.contains(target) &&
        !toggleRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener("mousedown", onDown);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <span className="draft-save-anyway">
      <button
        ref={toggleRef}
        type="button"
        className="btn ghost small"
        aria-expanded={open}
        aria-controls={popId}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        Save anyway
      </button>
      {open && (
        <div
          ref={popRef}
          id={popId}
          className="ui-popover draft-confirm"
          role="dialog"
          aria-label={copy.saveAnyway}
        >
          <p>
            The check found {count} problem{count === 1 ? "" : "s"}. Save
            anyway?
          </p>
          <div className="draft-confirm-actions">
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn primary small"
              onClick={() => {
                setOpen(false);
                onSave();
              }}
            >
              Save anyway
            </button>
          </div>
        </div>
      )}
    </span>
  );
};

const saveReason = (
  check: DesignSystemCheckResult | null,
  reading: boolean,
  running: boolean
): string | null => {
  if (reading) {
    return "Save is off while the studio reads your sources.";
  }

  if (running) {
    return "Save is off while the AI works on this design system.";
  }

  if (!check || check.passed) {
    return null;
  }

  const count = check.problems.length;

  return `Save is off: the check found ${count} problem${count === 1 ? "" : "s"}. Improve with AI fixes them.`;
};

interface SaveProps {
  check: DesignSystemCheckResult | null;
  ready: boolean;
  readyId: string;
  reading: boolean;
  running: boolean;
  onSave: (force: boolean) => Promise<void>;
}

const SaveControls = ({
  check,
  ready,
  readyId,
  reading,
  running,
  onSave,
}: SaveProps): ReactElement => {
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reasonId = useId();
  const reason = saveReason(check, reading, running);
  const failing = check !== null && !check.passed;

  const save = async (force: boolean): Promise<void> => {
    setBusy(true);
    setSaveError(null);

    try {
      await onSave(force);
    } catch (error) {
      setSaveError(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const describedBy = ready ? readyId : reason ? reasonId : undefined;

  return (
    <>
      {saveError && (
        <span className="alert error small" role="alert">
          {saveError}
        </span>
      )}
      {failing && !reading && (
        <SaveAnyway
          count={check.problems.length}
          busy={busy || running}
          onSave={() => void save(true)}
        />
      )}
      <span
        className="draft-save"
        data-tip={reason ?? null}
        data-tip-align="end"
      >
        <button
          type="button"
          className={`btn small${ready ? " primary" : ""}`}
          onClick={() => void save(false)}
          disabled={busy || reason !== null}
          aria-describedby={describedBy}
        >
          {busy ? "Saving…" : "Save to library"}
        </button>
      </span>
      {reason && (
        <span id={reasonId} className="sr-only">
          {reason}
        </span>
      )}
    </>
  );
};

const DraftBar = ({
  project,
  state,
  lastChange,
  onSave,
  improve,
  lastRun = null,
  reading = false,
  running = false,
}: Props): ReactElement | null => {
  const packId = project.designSystemFor ?? null;
  const { packs } = usePacks();

  const { coverage, check, error } = useDraftInfo(
    packId ? project.id : null,
    lastChange,
    lastRun?.status
  );

  const readyId = useId();

  if (!packId) {
    return null;
  }

  const name =
    state?.manifest?.name ?? findPack(packs, packId)?.name ?? project.name;

  const ready = Boolean(check?.passed) && improvePassed(lastRun);

  return (
    <div
      className="draft-bar"
      role="region"
      aria-label={copy.designSystemDraft}
    >
      {ready && (
        <span id={readyId} className="sr-only">
          The AI run passed the check. Save it to your library.
        </span>
      )}
      <DraftSummary
        name={name}
        coverage={coverage}
        check={check}
        run={lastRun}
        error={error}
      />
      <div className="draft-actions">
        {improve}
        <SaveControls
          check={check}
          ready={ready}
          readyId={readyId}
          reading={reading}
          running={running}
          onSave={(force) => onSave(name, packId, force)}
        />
      </div>
    </div>
  );
};

export { DraftBar };
