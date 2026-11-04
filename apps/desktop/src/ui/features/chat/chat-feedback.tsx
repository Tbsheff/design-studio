import { memo, useMemo } from "react";

import type { RunStatus } from "@design-studio/actions/_core/contracts";
import { baseName, formatMs, formatUsd } from "../../domain/format.js";
import { CopyButton } from "../../kit/CopyButton.js";
import { Icon } from "../../kit/Icon.js";
import { useRunFeedback } from "./run-feedback-model.js";
import type { Thumb } from "./run-feedback-model.js";
import type { RunView } from "./run-state-model.js";
import { runText } from "./run-state-model.js";
import { fileChanges, DiffBadge } from "./tool-chips.js";
import type { FileChange } from "./tool-chips.js";

const STATUS_LABEL: Record<RunStatus, string> = {
  budget_exceeded: "Limit reached",
  canceled: "Stopped",
  completed: "Completed",
  failed: "Failed",
  running: "Running",
};

const THUMB_PATH =
  "M5 7.25v6.25H2.5V7.25zM5 7.25 7.6 2.5c.9 0 1.6.7 1.6 1.6v2.4h3.3c.8 0 1.4.7 1.3 1.5l-.8 4.4c-.1.6-.7 1.1-1.3 1.1H5";

const ThumbIcon = ({ down = false }: { down?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={THUMB_PATH}
      transform={down ? "matrix(1 0 0 -1 0 16)" : undefined}
    />
  </svg>
);

const ThumbButton = ({
  value,
  on,
  onPick,
}: {
  value: Thumb;
  on: boolean;
  onPick: (value: Thumb | null) => void;
}) => {
  const label = value === "up" ? "Good response" : "Bad response";

  return (
    <button
      type="button"
      className="icon-btn small feedback-thumb"
      aria-label={label}
      aria-pressed={on}
      data-tip={label}
      data-tip-side="top"
      onClick={() => onPick(on ? null : value)}
    >
      <ThumbIcon down={value === "down"} />
    </button>
  );
};

const fileLabel = (change: FileChange): string =>
  `${change.created ? "Created" : "Edited"} ${baseName(change.path)}`;

const FileChips = ({
  changes,
  quiet,
  onOpen,
  reviews,
}: {
  changes: FileChange[];
  quiet: boolean;
  onOpen: () => void;
  reviews: boolean;
}) => {
  const action = reviews ? "Review the changes" : "Open run details";

  if (changes.length === 0) {
    return quiet ? <p className="run-no-changes">No files changed.</p> : null;
  }

  return (
    <ul
      className="run-changes"
      aria-label="Changed files"
      data-testid="run-changes"
    >
      {changes.map((change) => (
        <li key={change.path} className="run-change">
          <button
            type="button"
            className="ui-file-chip"
            data-tip-align="start"
            data-tip={`${change.path} (+${change.added} −${change.removed}). ${action}`}
            onClick={onOpen}
          >
            <Icon name={change.created ? "doc" : "file"} size={14} />
            <span className="run-change-path">{fileLabel(change)}</span>
            <DiffBadge added={change.added} removed={change.removed} />
          </button>
        </li>
      ))}
    </ul>
  );
};

const stopNote = (run: RunView): string | null => {
  const { summary } = run;

  if (!summary || run.status === "running" || run.status === "completed") {
    return null;
  }

  const restored = summary.restoredFiles ?? [];

  const putBack =
    restored.length > 0
      ? `Put back ${restored.map(baseName).join(", ")}: the write was cut off.`
      : "";

  const saved = summary.versionId ? "Saved what it changed as a version." : "";

  return [putBack, saved].filter(Boolean).join(" ") || null;
};

const StopNote = ({ run }: { run: RunView }) => {
  const note = stopNote(run);

  return note ? (
    <p className="run-no-changes" data-testid="run-stop-note">
      {note}
    </p>
  ) : null;
};

export const RunFeedbackRow = memo(
  ({
    run,
    onDetails,
    onReview,
  }: {
    run: RunView;
    onDetails: () => void;
    onReview?: (() => void) | undefined;
  }) => {
    const [feedback, setFeedback] = useRunFeedback(run.runId);

    const changes = useMemo(
      () => (run.status === "running" ? [] : fileChanges(run.tools)),
      [run.status, run.tools]
    );

    const { summary } = run;
    const done = run.status === "completed";

    return (
      <div className="run-feedback">
        <FileChips
          changes={changes}
          quiet={
            run.status !== "running" &&
            run.tools.length > 0 &&
            !run.request?.plan
          }
          onOpen={onReview ?? onDetails}
          reviews={onReview !== undefined}
        />
        <StopNote run={run} />
        <div className="run-foot" data-status={run.status}>
          {done && (
            <span
              className="run-thumbs"
              role="group"
              aria-label="Rate this response"
            >
              <ThumbButton
                value="up"
                on={feedback.thumb === "up"}
                onPick={(thumb) => setFeedback({ thumb })}
              />
              <ThumbButton
                value="down"
                on={feedback.thumb === "down"}
                onPick={(thumb) => setFeedback({ thumb })}
              />
            </span>
          )}
          {!done && (
            <span className={`status ${run.status}`}>
              <span className="status-dot" aria-hidden="true" />
              {STATUS_LABEL[run.status]}
            </span>
          )}
          {run.status !== "running" && runText(run) && (
            <CopyButton
              text={() => runText(run)}
              label="Copy reply"
              className="reply-copy"
            />
          )}
          {summary && (
            <span
              className="run-foot-meta tabular-nums"
              data-tip-side="top"
              data-tip={`$${summary.costUsd.toFixed(4)}`}
            >
              {formatMs(summary.durationMs)} · {formatUsd(summary.costUsd)}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {onReview && changes.length > 0 && (
              <button
                type="button"
                className="btn ghost small run-foot-details"
                data-tip="Keep or undo each change"
                data-tip-side="top"
                onClick={onReview}
              >
                Review
              </button>
            )}
            <button
              type="button"
              className="btn ghost small run-foot-details"
              onClick={onDetails}
            >
              Details
            </button>
          </span>
        </div>
      </div>
    );
  }
);
RunFeedbackRow.displayName = "RunFeedbackRow";
