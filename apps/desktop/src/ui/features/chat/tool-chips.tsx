import type { ToolDiff } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useState, useEffect, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import {
  Action,
  ActionContent,
  ActionIcon,
  ActionLabel,
  ActionTrigger,
} from "../../ai/components/ai/action.js";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtIcon,
} from "../../ai/components/ai/chain-of-thought.js";
import { Chip } from "../../ai/components/ai/chip.js";
import { IS_MAC } from "../../chat-slots.js";
import { formatMs } from "../../domain/format.js";
import { copy } from "./copy.js";
import type { ToolRow, RunView } from "./run-state-model.js";
import {
  CHECK_GROUP,
  COLLAPSE_AFTER,
  SHOW_MS_FROM,
  STATE_WORD,
  canceled,
  checkParts,
  failed,
  planHeld,
  shortName,
} from "./tool-chips-model.js";
import type { FileChange, RowGroup, ToolState } from "./tool-chips-model.js";
import {
  toolGroupLabel,
  toolSubject,
  toolTally,
  toolVerb,
  SKILL_TOOL,
} from "./tool-labels-model.js";

const toolDiffs = (tool: Pick<ToolRow, "diff" | "diffs">): ToolDiff[] =>
  tool.diffs ?? (tool.diff ? [tool.diff] : []);

const toolState = (tool: ToolRow, running = true): ToolState => {
  if (tool.durationMs === null) {
    return running ? "pending" : "stopped";
  }

  if (tool.denied || planHeld(tool)) {
    return "denied";
  }

  if (canceled(tool)) {
    return "stopped";
  }

  return tool.isError ? "error" : "done";
};

const quiet = (tool: ToolRow): boolean =>
  toolDiffs(tool).length === 0 && toolState(tool) === "done";

const sameRow = (
  left: ToolRow,
  right: ToolRow,
  workTree: string | null
): boolean => {
  if (!quiet(left) || !quiet(right)) {
    return false;
  }

  if (
    toolGroupLabel(left.name) === CHECK_GROUP &&
    toolGroupLabel(right.name) === CHECK_GROUP
  ) {
    return true;
  }

  return (
    left.name === right.name &&
    toolSubject(left.name, left.input, workTree) ===
      toolSubject(right.name, right.input, workTree)
  );
};

const groupRepeats = (
  tools: ToolRow[],
  workTree: string | null
): RowGroup[] => {
  const groups: RowGroup[] = [];

  for (const tool of tools) {
    const last = groups.at(-1);

    if (last && sameRow(last.tool, tool, workTree)) {
      last.count += 1;
      last.durationMs = (last.durationMs ?? 0) + (tool.durationMs ?? 0);
      last.members.push(tool);
    } else {
      groups.push({
        count: 1,
        durationMs: tool.durationMs,
        members: [tool],
        tool,
      });
    }
  }

  return groups;
};

const STATE_TONE: Record<ToolState, string> = {
  denied: "text-muted-foreground",
  done: "text-muted-foreground",
  error: "text-destructive",
  pending: "text-primary",
  stopped: "text-muted-foreground",
};

const shellEdits = (tool: ToolRow): ToolDiff[] =>
  tool.diff ? [] : (tool.diffs ?? []);

const DiffView = ({ diff }: { diff: ToolDiff }): ReactElement => {
  if (diff.hunks.length === 0) {
    return (
      <p className="diff-empty text-xs">
        {diff.truncated
          ? "The file is too large to show a diff."
          : "No line changes."}
      </p>
    );
  }

  return (
    <div className="diff-view" data-testid="diff-view">
      {diff.hunks.map((hunk, index) => {
        let oldLine = hunk.oldStart;
        let newLine = hunk.newStart;

        return (
          <div
            key={`${hunk.oldStart}-${hunk.newStart}-${index}`}
            className="diff-hunk"
          >
            {index > 0 && (
              <div className="diff-gap" aria-hidden="true">
                {copy.text12}
              </div>
            )}
            {hunk.lines.map((line, lineIndex) => {
              if (line.kind !== "add") {
                oldLine += 1;
              }

              if (line.kind !== "del") {
                newLine += 1;
              }

              const oldNo = line.kind === "add" ? "" : String(oldLine);
              const newNo = line.kind === "del" ? "" : String(newLine);

              return (
                <div
                  key={lineIndex}
                  className={`diff-line ${line.kind}`}
                  data-kind={line.kind}
                >
                  <span className="diff-no" aria-hidden="true">
                    {oldNo}
                  </span>
                  <span className="diff-no" aria-hidden="true">
                    {newNo}
                  </span>
                  <span className="diff-sign" aria-hidden="true">
                    {line.kind === "add"
                      ? "+"
                      : line.kind === "del"
                        ? "−"
                        : " "}
                  </span>
                  <span className="diff-text">
                    {line.kind !== "same" && (
                      <span className="sr-only">
                        {line.kind === "add" ? "Added: " : "Removed: "}
                      </span>
                    )}
                    {line.text || " "}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
      {diff.truncated && (
        <p className="diff-empty text-xs">{copy.theDiffIsCut}</p>
      )}
    </div>
  );
};

const DiffBadge = ({
  added,
  removed,
}: {
  added: number;
  removed: number;
}): ReactElement => (
  <span
    className="diff-badge tabular-nums"
    aria-label={`${added} lines added, ${removed} removed`}
  >
    {(added > 0 || removed === 0) && (
      <span className="diff-plus">
        {copy.text13}
        {added}
      </span>
    )}
    {removed > 0 && (
      <span className="diff-minus">
        {copy.text14}
        {removed}
      </span>
    )}
  </span>
);

const ShellEditDetail = ({
  tool,
  diffs,
}: {
  tool: ToolRow;
  diffs: ToolDiff[];
}): ReactElement => (
  <div className="flex min-w-0 flex-col gap-2 text-xs">
    {tool.summary && (
      <span className="font-mono break-all text-muted-foreground">
        {tool.summary}
      </span>
    )}
    {diffs.map((diff) => (
      <div key={diff.path} className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2 font-mono break-all text-foreground">
          {diff.path}
          <DiffBadge added={diff.added} removed={diff.removed} />
        </span>
        <DiffView diff={diff} />
      </div>
    ))}
  </div>
);

const ToolDetail = ({
  tool,
  target,
  state,
}: {
  tool: ToolRow;
  target: string;
  state: ToolState;
}): ReactElement => {
  if (tool.diff) {
    return <DiffView diff={tool.diff} />;
  }

  const edits = shellEdits(tool);

  if (edits.length > 0) {
    return <ShellEditDetail tool={tool} diffs={edits} />;
  }

  const detail = tool.summary || (state === "pending" ? "Running" : "");

  return (
    <div className="flex flex-col gap-1 text-xs">
      {target && (
        <span className="font-mono break-all text-foreground">{target}</span>
      )}
      {detail && (
        <span
          className={
            state === "error"
              ? "text-destructive wrap-anywhere"
              : "wrap-anywhere"
          }
        >
          {detail}
        </span>
      )}
    </div>
  );
};

const diffTotals = (diffs: ToolDiff[]): { added: number; removed: number } =>
  diffs.reduce(
    (sum, diff) => ({
      added: sum.added + diff.added,
      removed: sum.removed + diff.removed,
    }),
    { added: 0, removed: 0 }
  );

const rowView = (group: RowGroup, workTree: string | null) => {
  const { tool, members } = group;
  const edits = shellEdits(tool);

  if (
    new Set(
      members.map(
        (member) =>
          `${member.name}|${toolSubject(member.name, member.input, workTree)}`
      )
    ).size > 1
  ) {
    return {
      edits,
      target: checkParts(members, workTree),
      totals: null,
      verb: CHECK_GROUP,
    };
  }

  if (edits.length === 0) {
    return {
      edits,
      target: toolSubject(tool.name, tool.input, workTree),
      totals: tool.diff ?? null,
      verb: toolVerb(tool.name),
    };
  }

  return {
    edits,
    target:
      edits.length === 1 ? (edits[0]?.path ?? "") : `${edits.length} files`,
    totals: diffTotals(edits),
    verb: "Edited",
  };
};

const ToolMeta = ({
  group,
  state,
  totals,
}: {
  group: RowGroup;
  state: ToolState;
  totals: { added: number; removed: number } | null;
}): ReactElement => {
  const ms =
    state !== "pending" &&
    state !== "stopped" &&
    group.durationMs !== null &&
    group.durationMs >= SHOW_MS_FROM
      ? group.durationMs
      : null;

  return (
    <>
      {group.count > 1 && (
        <span className="tool-count tabular-nums">
          {copy.text15}
          {group.count}
        </span>
      )}
      {totals && <DiffBadge added={totals.added} removed={totals.removed} />}
      {ms !== null && (
        <span className="tool-ms shrink-0 tabular-nums">{formatMs(ms)}</span>
      )}
      {state === "denied" && (
        <span className="tool-denied">
          {planHeld(group.tool) ? "Plan only" : "Denied"}
        </span>
      )}
      {STATE_WORD[state] && state !== "denied" && (
        <span className="sr-only">{STATE_WORD[state]}</span>
      )}
    </>
  );
};

const TOOL_ICON: Record<string, IconName> = {
  Bash: "terminal",
  Edit: "pencil",
  Glob: "search",
  Grep: "search",
  MultiEdit: "pencil",
  Read: "file",
  Skill: "book",
  TodoWrite: "check",
  WebFetch: "globe",
  Write: "pencil",
};

const ToolStateIcon = ({
  tool,
  state,
}: {
  tool: ToolRow;
  state: ToolState;
}): ReactElement => {
  if (state === "pending") {
    return <span className="spinner" />;
  }

  if (state === "stopped" || state === "denied") {
    return <Icon name="close" size={14} />;
  }

  return (
    <Icon
      name={state === "error" ? "alert" : (TOOL_ICON[tool.name] ?? "code")}
      size={14}
    />
  );
};

const CheckDetail = ({
  members,
  workTree,
}: {
  members: ToolRow[];
  workTree: string | null;
}): ReactElement => (
  <ul className="tool-check-list flex flex-col gap-1 text-xs">
    {members.map((tool) => {
      const subject = toolSubject(tool.name, tool.input, workTree);

      return (
        <li key={tool.toolUseId} className="wrap-anywhere">
          <span className="text-foreground">{toolVerb(tool.name)}</span>
          {subject && <span className="font-mono"> {subject}</span>}
          {tool.summary && (
            <span className="text-muted-foreground">
              {copy.text}
              {tool.summary}
            </span>
          )}
        </li>
      );
    })}
  </ul>
);

const ToolItem = ({
  group,
  workTree,
  running,
}: {
  group: RowGroup;
  workTree: string | null;
  running: boolean;
}): ReactElement => {
  const { tool } = group;
  const state = toolState(tool, running);
  const [open, setOpen] = useState<boolean | null>(null);
  const isSkill = tool.name === SKILL_TOOL;
  const { edits, target, totals, verb } = rowView(group, workTree);
  const mixed = verb === CHECK_GROUP;

  return (
    <Action
      className={`tool-row ${state} ${isSkill ? "skill-tool" : ""}`}
      data-state={state}
      data-tool={tool.name}
      data-shell-edits={edits.length > 0 ? edits.length : null}
      open={open ?? state === "error"}
      onOpenChange={(next) => setOpen(next)}
    >
      <ActionTrigger
        className="tool-trigger max-w-full min-w-0 min-h-6 text-xs"
        data-tip={tool.summary || target || tool.name}
      >
        <ActionIcon className={STATE_TONE[state]}>
          <ToolStateIcon
            tool={edits.length > 0 ? { ...tool, name: "Edit" } : tool}
            state={state}
          />
        </ActionIcon>
        <ActionLabel
          className={`tool-verb font-medium ${state === "error" ? "text-destructive" : isSkill ? "text-primary" : ""}`}
        >
          {verb}
        </ActionLabel>
        {target && (
          <Chip size="sm" className="tool-target min-w-0 truncate font-mono">
            {isSkill || mixed ? target : shortName(target)}
          </Chip>
        )}
        <ToolMeta group={group} state={state} totals={totals} />
      </ActionTrigger>
      <ActionContent className="pl-6">
        {mixed ? (
          <CheckDetail members={group.members} workTree={workTree} />
        ) : (
          <ToolDetail tool={tool} target={target} state={state} />
        )}
      </ActionContent>
    </Action>
  );
};

const GroupSummary = ({ tools }: { tools: ToolRow[] }): ReactElement => {
  const errors = tools.filter(failed).length;
  const total = tools.reduce((sum, tool) => sum + (tool.durationMs ?? 0), 0);

  return (
    <>
      <span>
        {tools.length}
        {copy.toolCall}
        {tools.length === 1 ? "" : "s"}
      </span>
      {errors > 0 && (
        <span className="text-destructive">
          {errors}
          {copy.failed2}
        </span>
      )}
      {total > 0 && <span className="tabular-nums">{formatMs(total)}</span>}
    </>
  );
};

const ToolChips = ({
  tools,
  running,
  workTree,
  flat = false,
}: {
  tools: ToolRow[];
  running: boolean;
  workTree: string | null;
  flat?: boolean;
}): ReactElement | null => {
  const [open, setOpen] = useState<boolean | null>(null);

  if (tools.length === 0) {
    return null;
  }

  const rows = (
    <div className="tool-list flex flex-col">
      {groupRepeats(tools, workTree).map((group) => (
        <ToolItem
          key={group.tool.toolUseId}
          group={group}
          workTree={workTree}
          running={running}
        />
      ))}
    </div>
  );

  if (flat || tools.length < COLLAPSE_AFTER) {
    return <div className="tools tool-chips">{rows}</div>;
  }

  const expanded = open ?? (running || tools.some(failed));

  return (
    <ChainOfThought
      className="tools -ml-2"
      open={expanded}
      onOpenChange={(next) => setOpen(next)}
    >
      <ChainOfThoughtHeader className="tools-toggle text-xs">
        <ChainOfThoughtIcon>
          <Icon name="terminal" size={14} />
        </ChainOfThoughtIcon>
        <GroupSummary tools={tools} />
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="tool-chips">
        <div className="ml-4 border-l border-border pl-3">{rows}</div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};

const LIVE_VERB: Record<string, string> = {
  Bash: "Running",
  Edit: "Editing",
  Glob: "Finding",
  Grep: "Searching",
  MultiEdit: "Editing",
  Read: "Reading",
  Skill: "Loading skill",
  TodoWrite: "Updating todos",
  Write: "Writing",
};

const fileChanges = (tools: ToolRow[]): FileChange[] => {
  const byPath = new Map<string, FileChange>();

  for (const tool of tools) {
    const diffs = tool.diff
      ? tool.isError
        ? []
        : [tool.diff]
      : (tool.diffs ?? []);

    for (const diff of diffs) {
      const entry = byPath.get(diff.path) ?? {
        added: 0,
        created: false,
        path: diff.path,
        removed: 0,
      };

      entry.added += diff.added;
      entry.removed += diff.removed;
      entry.created ||= diff.created;
      byPath.set(diff.path, entry);
    }
  }

  return [...byPath.values()];
};

const ToolSummary = ({
  tools,
  children,
}: {
  tools: ToolRow[];
  children: ReactNode;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);

  const label = useMemo(
    () =>
      toolTally(
        tools.map((tool) => (shellEdits(tool).length > 0 ? "Edit" : tool.name))
      )
        .map((item) =>
          item.count > 1 ? `${item.label} ×${item.count}` : item.label
        )
        .join(", "),
    [tools]
  );

  const failedCount = useMemo(() => tools.filter(failed).length, [tools]);

  if (tools.length === 0) {
    return null;
  }

  return (
    <div
      className="tool-summary"
      data-open={open || null}
      data-testid="tool-summary"
    >
      <button
        type="button"
        className="tool-summary-head"
        aria-expanded={open}
        data-tip={label}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="tool-summary-icon" aria-hidden="true">
          <Icon name="sparkle" size={14} />
        </span>
        <span className="tool-summary-count tabular-nums">
          {tools.length}
          {copy.step}
          {tools.length === 1 ? "" : "s"}
        </span>
        <span className="tool-summary-label">{label}</span>
        {failedCount > 0 && (
          <span className="tool-summary-failed">
            {failedCount}
            {copy.failed2}
          </span>
        )}
        <Icon name="chevronDown" size={14} className="tool-summary-caret" />
      </button>
      {open && <div className="tool-summary-body">{children}</div>}
    </div>
  );
};

const useElapsed = (since: number, active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }

    const id = globalThis.setInterval(() => setNow(Date.now()), 1000);

    return (): void => globalThis.clearInterval(id);
  }, [active]);

  return Math.max(0, now - since);
};

const statusLabel = (
  run: RunView,
  workTree: string | null,
  now: number,
  offline: boolean
): string => {
  if (offline) {
    return "Lost the connection. Reconnecting…";
  }

  if (run.permissions.length > 0) {
    return "Waiting for your answer";
  }

  if (run.retry) {
    const seconds = Math.max(0, Math.ceil((run.retry.until - now) / 1000));

    return `Retrying in ${seconds}s (${run.retry.attempt}/${run.retry.max})`;
  }

  const pending = [...run.tools]
    .toReversed()
    .find((tool) => tool.durationMs === null);

  if (pending) {
    const target = toolSubject(pending.name, pending.input, workTree);

    return `${LIVE_VERB[pending.name] ?? toolVerb(pending.name)}${target ? ` ${shortName(target)}` : ""}`;
  }

  const last = run.parts.at(-1);

  if (last?.kind === "thinking" && last.open) {
    return "Thinking";
  }

  if (last?.kind === "text" && last.open) {
    return "Writing a reply";
  }

  return run.parts.length > 0 ? "Working" : "Starting";
};

const runStepText = (
  run: RunView | null,
  workTree: string | null
): string | null => {
  if (!run) {
    return null;
  }

  const todo = run.todos?.find(
    (item) => item.status === "in_progress" && !item.skipped
  );

  if (todo) {
    return todo.activeForm || todo.content;
  }

  if (run.retry) {
    return "Waiting to retry";
  }

  return statusLabel(run, workTree, Date.now(), false);
};

const elapsedText = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);

  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

const LiveStatus = ({
  run,
  workTree,
  offline = false,
  onStop,
}: {
  run: RunView;
  workTree: string | null;
  offline?: boolean;
  onStop?: () => void;
}): ReactElement => {
  const elapsed = useElapsed(run.startedAt, true);

  return (
    <div
      className="ui-status live-status"
      data-testid="live-status"
      data-offline={offline || null}
    >
      <span className="ui-status-mark" aria-hidden="true" />
      <span className="live-label min-w-0 truncate">
        {statusLabel(run, workTree, run.startedAt + elapsed, offline)}
      </span>
      <span className="live-elapsed tabular-nums">{elapsedText(elapsed)}</span>
      {onStop && (
        <button
          type="button"
          className="icon-btn small live-stop"
          aria-label={copy.stopRun}
          data-tip={`Stop (${shortcutLabel("stop", IS_MAC)})`}
          data-tip-align="end"
          onClick={onStop}
        >
          <Icon name="stop" size={12} />
        </button>
      )}
    </div>
  );
};

export {
  DiffBadge,
  DiffView,
  LiveStatus,
  ToolChips,
  ToolSummary,
  fileChanges,
  groupRepeats,
  runStepText,
  toolDiffs,
};

export type { FileChange };
