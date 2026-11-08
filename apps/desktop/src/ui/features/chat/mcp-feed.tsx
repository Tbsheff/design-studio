import type { McpActivity, McpApprovalOutcome } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useEffect, useState, useTransition } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { errorText } from "../../api.js";
import { formatTime } from "../../domain/format.js";
import { copy } from "./copy.js";
import { FOLD_AT, MCP_ACTIVE_MS, OUTCOME_VIEW } from "./mcp-feed-model.js";
import { mcpApi } from "./mcp-model.js";
import type { RunView } from "./run-state-model.js";
import type {
  McpApprovalCard,
  McpFeedControl,
  TimelineItem,
} from "./use-mcp-feed.js";

const DisconnectButton = (): ReactElement => {
  const [isDone, setIsDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disconnect = (): void => {
    setError(null);
    startTransition(async () => {
      try {
        await mcpApi.disconnect();
        setIsDone(true);
      } catch (thrownError: unknown) {
        setError(errorText(thrownError));
      }
    });
  };

  if (isDone) {
    return <span className="mcp-block-note">{copy.editsOff}</span>;
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
        data-tip={copy.turnOffAllow}
        data-tip-align="end"
        onClick={disconnect}
      >
        {copy.disconnect}
      </button>
    </>
  );
};

const useNow = (stepMs: number, active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }

    setNow(Date.now());
    const id = globalThis.setInterval(() => setNow(Date.now()), stepMs);

    return (): void => globalThis.clearInterval(id);
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
}): ReactElement => {
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
          <span className="mcp-row-undone">{copy.undone}</span>
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
            {copy.undo}
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

const McpBlock = ({
  client,
  entries,
  locked,
  onUndo,
}: {
  client: string;
  entries: McpActivity[];
  locked: boolean;
  onUndo: (versionId: string) => void;
}): ReactElement => {
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
          data-active={active || null}
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
          {copy.show}
          {hidden}
          {copy.earlier}
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
          {copy.showFewer}
        </button>
      )}
    </section>
  );
};

const countdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const McpApproval = ({
  card,
  compact = false,
  onAnswer,
}: {
  card: McpApprovalCard;
  compact?: boolean;
  onAnswer?: (allow: boolean) => void;
}): ReactElement => {
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

  const answer = (allow: boolean): void => {
    setError(null);
    startTransition(async () => {
      try {
        await mcpApi.answer(approval.id, allow);
        setLocal(allow ? "allow" : "deny");
        onAnswer?.(allow);
      } catch (thrownError: unknown) {
        const text = errorText(thrownError);

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
      className={cn("permission mcp-approval", compact && "compact")}
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
          {copy.allowOnce}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={isPending}
          onClick={() => answer(false)}
        >
          {copy.deny}
        </button>
        <span className="mcp-approval-time" aria-live="off">
          {countdown(approval.expiresAt - now)}
          {copy.left}
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

const McpItem = ({
  item,
  mcp,
}: {
  item: Exclude<TimelineItem, { kind: "run" }>;
  mcp: McpFeedControl | null;
}): ReactElement => {
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

const McpEditStrip = ({
  mcp,
}: {
  mcp: McpFeedControl | null;
}): ReactElement | null => {
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
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="mcp-block-dot"
          data-active={now - last.at < MCP_ACTIVE_MS || null}
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

export { MCP_ACTIVE_MS, McpApproval, McpBlock, McpEditStrip, McpItem };

export type { McpFeedControl, TimelineItem };
