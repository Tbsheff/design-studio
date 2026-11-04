import { useEffect, useState } from "react";

import type {
  Version,
  VersionChanges,
  VersionFileDiff,
} from "@design-studio/actions/_core/contracts";
import { splitHunks } from "../../../shared/hunk.js";
import type { PatchHunk } from "../../../shared/hunk.js";
import { Icon } from "../../kit/Icon.js";
import { COPY } from "./copy.js";
import { hunkKey, useHunkReview } from "./use-hunk-review.js";
import type { HunkState, HunkReview } from "./use-hunk-review.js";
import { displayTitle, indexVersions } from "./version-labels.js";
import { watchVersionChanges } from "./versions-api.js";

import "../../styles/compare-code.css";
import "../../styles/compare-hunk.css";

interface Line {
  kind: "add" | "del" | "ctx";
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

const OPEN_ALL_MAX = 8;

function hunkRows(hunk: PatchHunk): Line[] {
  const at = { new: hunk.newStart, old: hunk.oldStart };

  return hunk.lines.map((line) => {
    if (line.sign === "+") {
      return { kind: "add", newNo: at.new++, oldNo: null, text: line.text };
    }

    if (line.sign === "-") {
      return { kind: "del", newNo: null, oldNo: at.old++, text: line.text };
    }

    return { kind: "ctx", newNo: at.new++, oldNo: at.old++, text: line.text };
  });
}

const STATUS_WORD: Record<VersionFileDiff["status"], string> = {
  added: "Added",
  modified: "Changed",
  removed: "Removed",
  renamed: "Renamed",
};

function HunkStatus({ state }: { state: HunkState | undefined }) {
  if (state?.kind === "kept") {
    return (
      <span className="hunk-status kept">
        <Icon name="check" size={12} />
        Kept
      </span>
    );
  }

  if (state?.kind === "undone") {
    return (
      <span
        className="hunk-status undone"
        data-tip={`Saved as “${state.title}”. Cmd+Z brings it back.`}
      >
        <Icon name="undo" size={12} />
        Undone
      </span>
    );
  }

  return null;
}

function HunkHead(props: {
  header: string;
  index: number;
  state: HunkState | undefined;
  reviewable: boolean;
  onKeep: () => void;
  onUndo: () => void;
}) {
  const { state } = props;
  const settled = state?.kind === "undone" || state?.kind === "busy";

  return (
    <div className="hunk-head diff-gap" role="row">
      <span className="hunk-range truncate">{props.header}</span>
      <HunkStatus state={state} />
      {props.reviewable && !settled && (
        <span
          className="hunk-actions"
          role="group"
          aria-label={`Change ${props.index}`}
        >
          <button
            type="button"
            className="hunk-btn"
            aria-pressed={state?.kind === "kept"}
            data-tip={
              state?.kind === "kept"
                ? "Mark as not reviewed"
                : "Keep this change"
            }
            onClick={props.onKeep}
          >
            Keep
          </button>
          <button
            type="button"
            className="hunk-btn"
            data-tip={COPY.tipUndoOnlyThisChangeInTheHeadAsANewVersion}
            onClick={props.onUndo}
          >
            Undo this change
          </button>
        </span>
      )}
      {state?.kind === "busy" && (
        <span className="hunk-status" role="status">
          Undoing…
        </span>
      )}
    </div>
  );
}

function DiffRow({ line }: { line: Line }) {
  return (
    <div
      className={`diff-line ${line.kind === "ctx" ? "" : line.kind}`}
      role="row"
    >
      <span className="diff-no">{line.oldNo ?? ""}</span>
      <span className="diff-no">{line.newNo ?? ""}</span>
      <span className="diff-sign">
        {line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}
      </span>
      <span className="diff-text">{line.text}</span>
    </div>
  );
}

function canReview(file: VersionFileDiff, hunk: PatchHunk): boolean {
  return hunk.complete && file.status !== "removed";
}

function HunkBlock({
  file,
  hunk,
  review,
}: {
  file: VersionFileDiff;
  hunk: PatchHunk;
  review: HunkReview;
}) {
  const key = hunkKey(file.path, hunk.index);
  const state = review.states[key];

  return (
    <div
      className={`hunk ${state?.kind ?? ""}`}
      role="rowgroup"
      data-hunk={hunk.index}
    >
      <HunkHead
        header={hunk.header}
        index={hunk.index}
        state={state}
        reviewable={canReview(file, hunk)}
        onKeep={() => review.keep(key)}
        onUndo={() => review.undo(key, file.path, hunk.index)}
      />
      {state?.kind === "error" && (
        <div className="hunk-error" role="alert">
          {state.message}
        </div>
      )}
      {hunkRows(hunk).map((line, index) => (
        <DiffRow key={index} line={line} />
      ))}
    </div>
  );
}

function FilePatch({
  file,
  review,
}: {
  file: VersionFileDiff;
  review: HunkReview;
}) {
  if (file.binary) {
    return (
      <div className="diff-view compare-code-note">
        Binary file. No text diff.
      </div>
    );
  }

  const hunks = splitHunks(file.patch);

  if (hunks.length === 0) {
    return <div className="diff-view compare-code-note">No line changes.</div>;
  }

  return (
    <div
      className="diff-view compare-code-view"
      role="table"
      aria-label={`Diff of ${file.path}`}
    >
      {hunks.map((hunk) => (
        <HunkBlock key={hunk.index} file={file} hunk={hunk} review={review} />
      ))}
      {file.truncated && (
        <div className="diff-gap">The diff is longer. The rest is cut.</div>
      )}
    </div>
  );
}

function FileSection({
  file,
  open,
  onToggle,
  review,
}: {
  file: VersionFileDiff;
  open: boolean;
  onToggle: () => void;
  review: HunkReview;
}) {
  const name = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;

  return (
    <li className="compare-code-file">
      <button
        type="button"
        className="compare-code-head"
        aria-expanded={open}
        onClick={onToggle}
        data-tip={name}
      >
        <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
        <span className="compare-code-path truncate mono">{name}</span>
        <span className={`compare-code-status ${file.status}`}>
          {STATUS_WORD[file.status]}
        </span>
        <span className="diff-badge">
          <span className="diff-plus">+{file.additions}</span>
          <span className="diff-minus">−{file.deletions}</span>
        </span>
      </button>
      {open && <FilePatch file={file} review={review} />}
    </li>
  );
}

function useChanges(projectId: string, from: string, to: string) {
  const [state, setState] = useState<{
    key: string;
    changes: VersionChanges | null;
    error: string | null;
  } | null>(null);

  const key = `${projectId}/${from}/${to}`;
  useEffect(
    () =>
      watchVersionChanges(projectId, { from, to }, (result) =>
        setState({ key, ...result })
      ),
    [projectId, from, to, key]
  );

  return state?.key === key ? state : null;
}

function Pair({ older, newer }: { older: Version; newer: Version }) {
  const index = indexVersions([older, newer]);
  const a = displayTitle(older, index);
  const b = displayTitle(newer, index);

  return (
    <div
      className="compare-code-summary"
      role="group"
      aria-label={`Comparing A: ${a} to B: ${b}`}
    >
      <span className="badge accent">A</span>
      <span className="truncate" data-tip={a}>
        {a}
      </span>
      <Icon name="arrowRight" size={12} />
      <span className="badge accent">B</span>
      <span className="truncate" data-tip={b}>
        {b}
      </span>
    </div>
  );
}

function Summary({ changes }: { changes: VersionChanges }) {
  const add = changes.files.reduce((sum, file) => sum + file.additions, 0);
  const del = changes.files.reduce((sum, file) => sum + file.deletions, 0);
  const more = changes.totalFiles - changes.files.length;

  return (
    <div className="compare-code-summary">
      <span>
        {changes.totalFiles} {changes.totalFiles === 1 ? "file" : "files"}{" "}
        changed
      </span>
      <span className="diff-badge">
        <span className="diff-plus">+{add}</span>
        <span className="diff-minus">−{del}</span>
      </span>
      {more > 0 && (
        <span className="compare-code-more">{more} more files not shown</span>
      )}
    </div>
  );
}

export function CompareCode({
  projectId,
  older,
  newer,
}: {
  projectId: string;
  older: Version;
  newer: Version;
}) {
  const state = useChanges(projectId, older.id, newer.id);

  const review = useHunkReview(
    projectId,
    newer.directionId,
    older.id,
    newer.id
  );

  const [toggled, setToggled] = useState<Set<string>>(() => new Set());

  if (!state) {
    return (
      <div className="compare-code-empty" role="status">
        Loading the code diff…
      </div>
    );
  }

  if (state.error || !state.changes) {
    return (
      <div className="stage-message" role="alert">
        {state.error ?? "Could not load the code diff."}
      </div>
    );
  }

  const { changes } = state;

  if (changes.files.length === 0) {
    return (
      <div className="compare-code-empty">
        These versions have the same files.
      </div>
    );
  }

  const openByDefault = changes.files.length <= OPEN_ALL_MAX;

  const toggle = (path: string) =>
    setToggled((prev) => {
      const next = new Set(prev);

      if (!next.delete(path)) {
        next.add(path);
      }

      return next;
    });

  return (
    <div className="compare-code">
      <Pair older={older} newer={newer} />
      <Summary changes={changes} />
      <ul className="compare-code-files">
        {changes.files.map((file) => (
          <FileSection
            key={file.path}
            file={file}
            open={openByDefault !== toggled.has(file.path)}
            onToggle={() => toggle(file.path)}
            review={review}
          />
        ))}
      </ul>
    </div>
  );
}
