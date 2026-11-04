import { useEffect, useState, useTransition } from "react";

import type {
  McpActivity,
  McpApprovalOutcome,
} from "../../../shared/actions/_core/contracts.js";
import { errorText } from "../../api.js";
import { formatTime } from "../../domain/format.js";
import { Icon } from "../../kit/Icon.js";
import type { IconName } from "../../kit/Icon.js";
import { mcpApi } from "./mcp-model.js";
import type { RunView } from "./run-state-model.js";
import type { McpApprovalCard, McpFeedState } from "./use-mcp-feed.js";

export type TimelineItem =
  | { kind: "run"; key: string; at: number; run: RunView }
  | {
      kind: "block";
      key: string;
      at: number;
      client: string;
      entries: McpActivity[];
    }
  | { kind: "approval"; key: string; at: number; card: McpApprovalCard };

export const timelineOf = (
  runs: readonly RunView[],
  feed: McpFeedState | null
): TimelineItem[] => {
  const items: TimelineItem[] = runs.map((run) => ({
    at: run.startedAt,
    key: run.runId,
    kind: "run",
    run,
  }));

  if (!feed) {
    return items;
  }

  for (const card of feed.approvals) {
    items.push({
      at: card.approval.createdAt,
      card,
      key: `approval-${card.approval.id}`,
      kind: "approval",
    });
  }

  const singles: TimelineItem[] = feed.activity.map((entry) => ({
    at: entry.at,
    client: entry.client,
    entries: [entry],
    key: `mcp-${entry.id}`,
    kind: "block",
  }));

  const sorted = [...items, ...singles].toSorted((a, b) => a.at - b.at);
  const out: TimelineItem[] = [];

  for (const item of sorted) {
    const last = out.at(-1);

    if (
      item.kind === "block" &&
      last?.kind === "block" &&
      last.client === item.client
    ) {
      last.entries.push(...item.entries);
    } else {
      out.push(
        item.kind === "block" ? { ...item, entries: [...item.entries] } : item
      );
    }
  }

  return out;
};

export interface McpFeedControl extends McpFeedState {
  locked: boolean;
  onUndo: (versionId: string) => void;
}

export const feedShown = (mcp: McpFeedControl | null): boolean =>
  mcp !== null && (mcp.activity.length > 0 || mcp.approvals.length > 0);

const DisconnectButton = () => {
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disconnect = () => {
    setError(null);
    startTransition(async () => {
      try {
        await mcpApi.disconnect();
        setIsDone(true);
      } catch (caught: unknown) {
        setError(errorText(caught));
      }
    });
  };

  if (isDone) {
    return <span className="mcp-block-note">Edits off</span>;
  }

  return (
    <>
      {error && (
        <span className="mcp-block-error" role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        className="mcp-block-btn"
        disabled={isPending}
        data-tip="Turn off Allow edits. The MCP server keeps running."
        data-tip-align="end"
        onClick={disconnect}
      >
        Disconnect
      </button>
    </>
  );
};

export const MCP_ACTIVE_MS = 60_000;

const FOLD_AT = 5;

const useNow = (stepMs: number, active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }

    setNow(Date.now());
    const id = globalThis.setInterval(() => setNow(Date.now()), stepMs);

    return () => globalThis.clearInterval(id);
  }, [stepMs, active]);

  return now;
};

const TOOL_ICONS: Record<string, IconName> = {
  add_comment: "comment",
  add_frame: "frame",
  add_route_frame: "frame",
  apply_design_system: "palette",
  arrange: "frame",
  attach_app: "plus",
  batch_edit: "layers",
  canvas_place: "frame",
  create_design_system: "palette",
  create_project: "plus",
  edit_element: "pencil",
  export: "download",
  insert_component: "component",
  measure: "scan",
  open_folder: "folder",
  redo: "reload",
  remove_frame: "trash",
  replace_style: "token",
  reply_comment: "comment",
  resolve_comment: "check",
  restore_version: "restore",
  save_design_system: "book",
  set_props: "component",
  set_token: "token",
  ship: "branch",
  undo: "undo",
  write_file: "file",
};

const ActivityRow = ({
  entry,
  locked,
  onUndo,
  readOnly = false,
}: {
  entry: McpActivity;
  locked: boolean;
  onUndo: (versionId: string) => void;
  readOnly?: boolean;
}) => {
  const [undone, setUndone] = useState(false);
  const before = entry.versionId ? entry.beforeVersionId : null;

  return (
    <li className="mcp-row" data-testid="mcp-row" data-tool={entry.tool}>
      <span className="mcp-row-icon" aria-hidden="true">
        <Icon name={TOOL_ICONS[entry.tool] ?? "sparkle"} size={14} />
      </span>
      <span className="mcp-row-text" data-tip={entry.summary}>
        {entry.summary}
      </span>
      {before &&
        !readOnly &&
        (undone ? (
          <span className="mcp-row-undone">Undone</span>
        ) : (
          <button
            type="button"
            className="mcp-row-undo"
            disabled={locked}
            data-tip={
              locked
                ? "Wait for the run to finish"
                : "Restore the version before this edit"
            }
            data-tip-align="end"
            onClick={() => {
              setUndone(true);
              onUndo(before);
            }}
          >
            Undo
          </button>
        ))}
      <time
        className="mcp-row-time"
        dateTime={new Date(entry.at).toISOString()}
      >
        {formatTime(entry.at)}
      </time>
    </li>
  );
};

export const McpBlock = ({
  client,
  entries,
  locked,
  onUndo,
}: {
  client: string;
  entries: McpActivity[];
  locked: boolean;
  onUndo: (versionId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const lastAt = entries.at(-1)?.at ?? 0;
  const now = useNow(10_000, Date.now() - lastAt < MCP_ACTIVE_MS);
  const active = now - lastAt < MCP_ACTIVE_MS;
  const hidden = open ? 0 : Math.max(0, entries.length - FOLD_AT);

  return (
    <section
      className="mcp-block"
      aria-label={`Edits by ${client}`}
      data-testid="mcp-block"
    >
      <header className="mcp-block-head">
        <span
          className="mcp-block-dot"
          data-active={active || undefined}
          aria-hidden="true"
        />
        <strong className="mcp-block-name">{client}</strong>
        <span className="mcp-block-state">
          {active
            ? "Active"
            : `${entries.length} ${entries.length === 1 ? "edit" : "edits"}`}
        </span>
        <span className="spacer" />
        <DisconnectButton />
      </header>
      {hidden > 0 && (
        <button
          type="button"
          className="mcp-more"
          onClick={() => setOpen(true)}
        >
          Show {hidden} earlier
        </button>
      )}
      <ul className="mcp-rows">
        {entries.slice(hidden).map((entry) => (
          <ActivityRow
            key={entry.id}
            entry={entry}
            locked={locked}
            onUndo={onUndo}
          />
        ))}
      </ul>
      {open && entries.length > FOLD_AT && (
        <button
          type="button"
          className="mcp-more"
          onClick={() => setOpen(false)}
        >
          Show fewer
        </button>
      )}
    </section>
  );
};

const OUTCOME_VIEW: Record<
  McpApprovalOutcome,
  { readonly icon: IconName; readonly text: string }
> = {
  allow: { icon: "check", text: "Allowed" },
  closed: { icon: "alert", text: "Closed" },
  deny: { icon: "close", text: "Denied" },
  timeout: { icon: "alert", text: "Expired" },
};

const countdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const McpApproval = ({
  card,
  compact = false,
  onAnswer,
}: {
  card: McpApprovalCard;
  compact?: boolean;
  onAnswer?: (allow: boolean) => void;
}) => {
  const { approval } = card;
  const [local, setLocal] = useState<McpApprovalOutcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000, card.outcome === null && local === null);

  const outcome =
    card.outcome ?? local ?? (now >= approval.expiresAt ? "timeout" : null);

  if (outcome) {
    return (
      <div
        className="mcp-approval-done"
        data-testid="mcp-approval"
        data-outcome={outcome}
      >
        <Icon name={OUTCOME_VIEW[outcome].icon} size={14} />
        <strong>{OUTCOME_VIEW[outcome].text}</strong>
        <span className="mcp-approval-done-text" data-tip={approval.title}>
          {approval.title}
        </span>
      </div>
    );
  }

  const answer = (allow: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        await mcpApi.answer(approval.id, allow);
        setLocal(allow ? "allow" : "deny");
        onAnswer?.(allow);
      } catch (caught: unknown) {
        const text = errorText(caught);

        if (/not open/u.test(text)) {
          setLocal("timeout");
        } else {
          setError(text);
        }
      }
    });
  };

  return (
    <section
      className={`permission mcp-approval${compact ? " compact" : ""}`}
      role="group"
      aria-label={approval.title}
      data-testid="mcp-approval"
      data-outcome="pending"
    >
      <header className="permission-head">
        <Icon name={TOOL_ICONS[approval.tool] ?? "download"} size={14} />
        <strong>{approval.title}</strong>
      </header>
      {approval.detail && (
        <p className="mcp-approval-detail">{approval.detail}</p>
      )}
      <div className="permission-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={isPending}
          onClick={() => answer(true)}
        >
          Allow once
        </button>
        <button
          type="button"
          className="btn small"
          disabled={isPending}
          onClick={() => answer(false)}
        >
          Deny
        </button>
        <span className="mcp-approval-time" aria-live="off">
          {countdown(approval.expiresAt - now)} left
        </span>
      </div>
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};

export const McpItem = ({
  item,
  mcp,
}: {
  item: Exclude<TimelineItem, { kind: "run" }>;
  mcp: McpFeedControl | null;
}) => {
  if (item.kind === "approval") {
    return <McpApproval card={item.card} />;
  }

  return (
    <McpBlock
      client={item.client}
      entries={item.entries}
      locked={mcp?.locked ?? true}
      onUndo={(versionId) => mcp?.onUndo(versionId)}
    />
  );
};

const RECENT_MS = 10 * 60_000;

export const McpEditStrip = ({ mcp }: { mcp: McpFeedControl | null }) => {
  const last = mcp?.activity.at(-1) ?? null;
  const now = useNow(10_000, last !== null);
  const [open, setOpen] = useState(false);

  if (!mcp || !last || now - last.at > RECENT_MS) {
    return null;
  }

  const entries = mcp.activity
    .filter((entry) => entry.client === last.client)
    .slice(-FOLD_AT);

  return (
    <section
      className="mcp-edit-strip"
      aria-label={`Edits by ${last.client}`}
      data-testid="mcp-edit-strip"
    >
      {open && (
        <ul className="mcp-rows">
          {entries.map((entry) => (
            <ActivityRow
              key={entry.id}
              entry={entry}
              locked={mcp.locked}
              onUndo={mcp.onUndo}
              readOnly
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="mcp-edit-head"
        aria-expanded={open}
        data-tip={
          open
            ? "Hide the outside edits"
            : "Show the recent outside edits. Undo them from the chat after you save or discard."
        }
        data-tip-side="top"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="mcp-block-dot"
          data-active={now - last.at < MCP_ACTIVE_MS || undefined}
          aria-hidden="true"
        />
        <strong className="mcp-edit-client">{last.client}</strong>
        <span className="mcp-edit-summary truncate">{last.summary}</span>
        <time
          className="mcp-row-time"
          dateTime={new Date(last.at).toISOString()}
        >
          {formatTime(last.at)}
        </time>
        <Icon name="chevronDown" size={12} className="mcp-edit-caret" />
      </button>
    </section>
  );
};
