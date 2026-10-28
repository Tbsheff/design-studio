import { useEffect, useState } from 'react';
import type { McpActivity, McpApprovalOutcome } from '../../shared/contracts';
import { errorText } from '../api';
import { formatTime } from '../format';
import { mcpApi } from '../mcpApi';
import type { RunView } from '../runState';
import type { McpApprovalCard, McpFeedState } from '../useMcpFeed';
import { Icon, type IconName } from './Icon';

export const MCP_ACTIVE_MS = 60_000;
const FOLD_AT = 5;

export interface McpFeedControl extends McpFeedState {
  locked: boolean;
  onUndo: (versionId: string) => void;
}

export type TimelineItem =
  | { kind: 'run'; key: string; at: number; run: RunView }
  | { kind: 'block'; key: string; at: number; client: string; entries: McpActivity[] }
  | { kind: 'approval'; key: string; at: number; card: McpApprovalCard };

export function timelineOf(runs: readonly RunView[], feed: McpFeedState | null): TimelineItem[] {
  const items: TimelineItem[] = runs.map((run) => ({ kind: 'run', key: run.runId, at: run.startedAt, run }));
  if (!feed) return items;
  for (const card of feed.approvals) items.push({ kind: 'approval', key: `approval-${card.approval.id}`, at: card.approval.createdAt, card });
  const singles: TimelineItem[] = feed.activity.map((entry) => ({ kind: 'block', key: `mcp-${entry.id}`, at: entry.at, client: entry.client, entries: [entry] }));
  const sorted = [...items, ...singles].sort((a, b) => a.at - b.at);
  const out: TimelineItem[] = [];
  for (const item of sorted) {
    const last = out.at(-1);
    if (item.kind === 'block' && last?.kind === 'block' && last.client === item.client) last.entries.push(...item.entries);
    else out.push(item.kind === 'block' ? { ...item, entries: [...item.entries] } : item);
  }
  return out;
}

const TOOL_ICONS: Record<string, IconName> = {
  write_file: 'file',
  edit_element: 'pencil',
  canvas_place: 'frame',
  add_frame: 'frame',
  add_route_frame: 'frame',
  attach_app: 'plus',
  remove_frame: 'trash',
  restore_version: 'restore',
  apply_design_system: 'palette',
  set_token: 'token',
  add_comment: 'comment',
  reply_comment: 'comment',
  resolve_comment: 'check',
  create_project: 'plus',
  export: 'download',
  ship: 'branch',
  batch_edit: 'layers',
  undo: 'undo',
  redo: 'reload',
  open_folder: 'folder',
  create_design_system: 'palette',
  save_design_system: 'book',
};

function useNow(stepMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs, active]);
  return now;
}

function ActivityRow({ entry, locked, onUndo }: { entry: McpActivity; locked: boolean; onUndo: (versionId: string) => void }) {
  const [undone, setUndone] = useState(false);
  const before = entry.versionId ? entry.beforeVersionId : null;
  return (
    <li className="mcp-row" data-testid="mcp-row" data-tool={entry.tool}>
      <span className="mcp-row-icon" aria-hidden="true">
        <Icon name={TOOL_ICONS[entry.tool] ?? 'sparkle'} size={14} />
      </span>
      <span className="mcp-row-text" title={entry.summary}>
        {entry.summary}
      </span>
      {before &&
        (undone ? (
          <span className="mcp-row-undone">Undone</span>
        ) : (
          <button
            type="button"
            className="mcp-row-undo"
            disabled={locked}
            data-tip={locked ? 'Wait for the run to finish' : 'Restore the version before this edit'}
            data-tip-align="end"
            onClick={() => {
              setUndone(true);
              onUndo(before);
            }}
          >
            Undo
          </button>
        ))}
      <time className="mcp-row-time" dateTime={new Date(entry.at).toISOString()}>
        {formatTime(entry.at)}
      </time>
    </li>
  );
}

function DisconnectButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  if (state === 'done') return <span className="mcp-block-note">Edits off</span>;
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
        disabled={state === 'busy'}
        data-tip="Turn off Allow edits. The MCP server keeps running."
        data-tip-align="end"
        onClick={() => {
          setState('busy');
          setError(null);
          mcpApi
            .disconnect()
            .then(() => setState('done'))
            .catch((err: unknown) => {
              setState('idle');
              setError(errorText(err));
            });
        }}
      >
        Disconnect
      </button>
    </>
  );
}

export function McpBlock({ client, entries, locked, onUndo }: { client: string; entries: McpActivity[]; locked: boolean; onUndo: (versionId: string) => void }) {
  const [open, setOpen] = useState(false);
  const lastAt = entries.at(-1)?.at ?? 0;
  const now = useNow(10_000, Date.now() - lastAt < MCP_ACTIVE_MS);
  const active = now - lastAt < MCP_ACTIVE_MS;
  const hidden = open ? 0 : Math.max(0, entries.length - FOLD_AT);
  return (
    <section className="mcp-block" aria-label={`Edits by ${client}`} data-testid="mcp-block">
      <header className="mcp-block-head">
        <span className="mcp-block-dot" data-active={active || undefined} aria-hidden="true" />
        <strong className="mcp-block-name">{client}</strong>
        <span className="mcp-block-state">{active ? 'Active' : `${entries.length} ${entries.length === 1 ? 'edit' : 'edits'}`}</span>
        <span className="spacer" />
        <DisconnectButton />
      </header>
      {hidden > 0 && (
        <button type="button" className="mcp-more" onClick={() => setOpen(true)}>
          Show {hidden} earlier
        </button>
      )}
      <ul className="mcp-rows">
        {entries.slice(hidden).map((entry) => (
          <ActivityRow key={entry.id} entry={entry} locked={locked} onUndo={onUndo} />
        ))}
      </ul>
      {open && entries.length > FOLD_AT && (
        <button type="button" className="mcp-more" onClick={() => setOpen(false)}>
          Show fewer
        </button>
      )}
    </section>
  );
}

const OUTCOME_TEXT: Record<McpApprovalOutcome, string> = { allow: 'Allowed', deny: 'Denied', timeout: 'Expired', closed: 'Closed' };

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function McpApproval({ card, compact = false, onAnswer }: { card: McpApprovalCard; compact?: boolean; onAnswer?: (allow: boolean) => void }) {
  const { approval } = card;
  const [local, setLocal] = useState<McpApprovalOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000, card.outcome === null && local === null);
  const outcome = card.outcome ?? local ?? (now >= approval.expiresAt ? 'timeout' : null);
  if (outcome) {
    return (
      <div className="mcp-approval-done" data-testid="mcp-approval" data-outcome={outcome}>
        <Icon name={outcome === 'allow' ? 'check' : outcome === 'deny' ? 'close' : 'alert'} size={14} />
        <strong>{OUTCOME_TEXT[outcome]}</strong>
        <span className="mcp-approval-done-text" title={approval.title}>
          {approval.title}
        </span>
      </div>
    );
  }
  const answer = (allow: boolean) => {
    setBusy(true);
    setError(null);
    mcpApi.answer(approval.id, allow).then(() => onAnswer?.(allow)).catch((err: unknown) => {
      setBusy(false);
      const text = errorText(err);
      if (/not open/.test(text)) setLocal('timeout');
      else setError(text);
    });
  };
  return (
    <section className={`permission mcp-approval${compact ? ' compact' : ''}`} role="group" aria-label={approval.title} data-testid="mcp-approval" data-outcome="pending">
      <header className="permission-head">
        <Icon name={TOOL_ICONS[approval.tool] ?? 'download'} size={14} />
        <strong>{approval.title}</strong>
      </header>
      {approval.detail && <p className="mcp-approval-detail">{approval.detail}</p>}
      <div className="permission-actions">
        <button type="button" className="btn small primary" disabled={busy} onClick={() => answer(true)}>
          Allow once
        </button>
        <button type="button" className="btn small" disabled={busy} onClick={() => answer(false)}>
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
}

export function feedShown(mcp: McpFeedControl | null): boolean {
  return mcp !== null && (mcp.activity.length > 0 || mcp.approvals.length > 0);
}

export function McpItem({ item, mcp }: { item: Exclude<TimelineItem, { kind: 'run' }>; mcp: McpFeedControl | null }) {
  if (item.kind === 'approval') return <McpApproval card={item.card} />;
  return <McpBlock client={item.client} entries={item.entries} locked={mcp?.locked ?? true} onUndo={(versionId) => mcp?.onUndo(versionId)} />;
}
