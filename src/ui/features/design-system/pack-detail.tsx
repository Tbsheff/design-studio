import { useEffect, useState, useTransition } from "react";

import type {
  DesignSystemCheckResult,
  PackDetail,
  PackSummary,
} from "../../../shared/contracts.js";
import { Markdown } from "../../ai/components/ai/markdown.js";
import { errorText } from "../../api.js";
import { Icon } from "../../kit/Icon.js";
import { packApi } from "../../platform/pack-api.js";
import { useModalDialog } from "../../usePopover.js";
import { COPY } from "./copy.js";
import { PackBadges } from "./pack-badges.js";
import { PackPreview } from "./pack-preview.js";

export interface PackDetailActions {
  onRename: (pack: PackSummary) => void;
  onDuplicate: (pack: PackSummary) => Promise<void>;
  onDelete: (pack: PackSummary) => void;
  onExport: (pack: PackSummary) => Promise<void>;
  onOpenEditor: (pack: PackSummary) => Promise<void>;
  onUseInNew: (pack: PackSummary) => void;
  onApply: ((pack: PackSummary) => Promise<void>) | null;
}

interface Load<T> {
  value: T | null;
  error: string | null;
}

function useLoad<T>(load: () => Promise<T>, key: string): Load<T> {
  const [state, setState] = useState<Load<T>>({ error: null, value: null });
  useEffect(() => {
    let live = true;
    setState({ error: null, value: null });
    const read = async () => {
      try {
        const value = await load();

        if (live) {
          setState({ error: null, value });
        }
      } catch (error) {
        if (live) {
          setState({ error: errorText(error), value: null });
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [key]);

  return state;
}

function CheckResult({ check }: { check: Load<DesignSystemCheckResult> }) {
  if (check.error) {
    return (
      <div className="alert error small">
        Could not run the check. {check.error}
      </div>
    );
  }

  if (!check.value) {
    return (
      <div className="lib-check" role="status">
        <span className="spinner" /> Checking…
      </div>
    );
  }

  if (check.value.passed) {
    return (
      <div className="lib-check ok" role="status">
        <Icon name="check" size={14} />
        Check passed: tokens, AA contrast, DESIGN.md sections and fonts.
      </div>
    );
  }

  const { problems } = check.value;
  const byRule = new Map<string, string[]>();

  for (const problem of problems) {
    byRule.set(problem.rule, [
      ...(byRule.get(problem.rule) ?? []),
      problem.message,
    ]);
  }

  return (
    <div className="lib-check fail" role="status">
      <strong>
        {problems.length} {problems.length === 1 ? "problem" : "problems"}
      </strong>
      <ul>
        {[...byRule].map(([rule, messages]) => (
          <li key={rule}>
            <span className="badge">{rule}</span>
            <ul className="lib-check-messages">
              {messages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionBar({
  pack,
  actions,
  busy,
  run,
}: {
  pack: PackSummary;
  actions: PackDetailActions;
  busy: boolean;
  run: (task: () => Promise<void>) => void;
}) {
  const user = pack.source === "user";
  const usable = !pack.draft;

  return (
    <div className="lib-actions" aria-label={COPY.labelActions} role="group">
      {actions.onApply && usable && (
        <button
          type="button"
          className="btn primary small"
          disabled={busy}
          onClick={() => run(() => actions.onApply!(pack))}
        >
          Apply to current project
        </button>
      )}
      {usable && (
        <button
          type="button"
          className={`btn small ${actions.onApply ? "" : "primary"}`}
          disabled={busy}
          onClick={() => actions.onUseInNew(pack)}
        >
          Use in new project
        </button>
      )}
      {user ? (
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => run(() => actions.onOpenEditor(pack))}
        >
          Open in editor
        </button>
      ) : (
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => run(() => actions.onDuplicate(pack))}
        >
          Make a copy to edit
        </button>
      )}
      {user && (
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => run(() => actions.onDuplicate(pack))}
        >
          Duplicate
        </button>
      )}
      {user && (
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={() => actions.onRename(pack)}
        >
          Rename
        </button>
      )}
      <button
        type="button"
        className="btn small has-icon"
        disabled={busy}
        onClick={() => run(() => actions.onExport(pack))}
      >
        <Icon name="download" size={14} />
        Export
      </button>
      {user && (
        <button
          type="button"
          className="btn ghost danger small"
          disabled={busy}
          onClick={() => actions.onDelete(pack)}
        >
          Delete
        </button>
      )}
    </div>
  );
}

export function PackDetailDialog({
  pack,
  actions,
  onClose,
}: {
  pack: PackSummary;
  actions: PackDetailActions;
  onClose: () => void;
}) {
  const detail = useLoad<PackDetail>(
    () => packApi.getPack(pack.id),
    `${pack.id}:${pack.name}`
  );

  const check = useLoad<DesignSystemCheckResult>(
    () => packApi.checkPack(pack.id),
    `${pack.id}:${pack.name}`
  );

  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useModalDialog(() => (busy ? false : onClose()));

  const run = (task: () => Promise<void>) => {
    if (busy) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch (failure) {
        setError(errorText(failure));
      }
    });
  };

  return (
    <dialog
      ref={dialog.ref}
      className="modal lib-detail"
      aria-label={`${pack.name} design system`}
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div className="titles">
          <h2>{pack.name}</h2>
          <p>{pack.description}</p>
          <PackBadges pack={pack} />
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={COPY.labelCloseDesignSystem}
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="lib-detail-bar">
        <ActionBar pack={pack} actions={actions} busy={busy} run={run} />
        {error && (
          <div className="alert error small" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="modal-body lib-detail-body" aria-busy={busy}>
        <section className="lib-detail-section" aria-label={COPY.labelPreview}>
          <h3>Preview</h3>
          {detail.error && (
            <div className="alert error small">
              Could not load the tokens. {detail.error}
            </div>
          )}
          {detail.value ? (
            <PackPreview pack={pack} entries={detail.value.entries} />
          ) : (
            !detail.error && <div className="pv-skeleton" aria-hidden="true" />
          )}
        </section>
        <section className="lib-detail-section" aria-label={COPY.labelCheck}>
          <h3>Check</h3>
          <CheckResult check={check} />
        </section>
        <section className="lib-detail-section" aria-label={COPY.labelDesignMd}>
          <h3>DESIGN.md</h3>
          {detail.value && (
            <Markdown className="lib-doc">{detail.value.designMd}</Markdown>
          )}
        </section>
      </div>
    </dialog>
  );
}
