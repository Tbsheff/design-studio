import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ToolDiff } from '../../shared/contracts';
import { Action, ActionContent, ActionIcon, ActionLabel, ActionTrigger } from '../ai/components/ai/action';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtIcon,
} from '../ai/components/ai/chain-of-thought';
import { Chip } from '../ai/components/ai/chip';
import { formatMs } from '../format';
import type { RunView, ToolRow } from '../runState';
import { SKILL_TOOL, toolSubject, toolTally, toolVerb } from '../toolLabels';
import { Icon, type IconName } from './Icon';

const TOOL_ICON: Record<string, IconName> = {
  Write: 'pencil',
  Edit: 'pencil',
  MultiEdit: 'pencil',
  Read: 'file',
  Bash: 'terminal',
  Grep: 'search',
  Glob: 'search',
  WebFetch: 'globe',
  Skill: 'book',
  TodoWrite: 'check',
};

const LIVE_VERB: Record<string, string> = {
  Write: 'Writing',
  Edit: 'Editing',
  MultiEdit: 'Editing',
  Read: 'Reading',
  Bash: 'Running',
  Grep: 'Searching',
  Glob: 'Finding',
  Skill: 'Loading skill',
  TodoWrite: 'Updating todos',
};

type ToolState = 'pending' | 'done' | 'error' | 'stopped' | 'denied';

const STATE_TONE: Record<ToolState, string> = {
  pending: 'text-primary',
  done: 'text-muted-foreground',
  error: 'text-destructive',
  stopped: 'text-muted-foreground',
  denied: 'text-muted-foreground',
};

const STATE_WORD: Partial<Record<ToolState, string>> = { error: 'Error', stopped: 'Stopped', denied: 'Denied' };

function toolState(tool: ToolRow, running = true): ToolState {
  if (tool.durationMs === null) return running ? 'pending' : 'stopped';
  if (tool.denied) return 'denied';
  return tool.isError ? 'error' : 'done';
}

function shortName(target: string): string {
  const parts = target.split('/');
  return parts[parts.length - 1] || target;
}

interface RowGroup {
  tool: ToolRow;
  count: number;
  durationMs: number | null;
}

export function groupRepeats(tools: ToolRow[], workTree: string | null): RowGroup[] {
  const groups: RowGroup[] = [];
  for (const tool of tools) {
    const last = groups.at(-1);
    const same =
      last &&
      !last.tool.diff &&
      !tool.diff &&
      toolState(last.tool) === 'done' &&
      toolState(tool) === 'done' &&
      last.tool.name === tool.name &&
      toolSubject(last.tool.name, last.tool.input, workTree) === toolSubject(tool.name, tool.input, workTree);
    if (same) {
      last.count += 1;
      last.durationMs = (last.durationMs ?? 0) + (tool.durationMs ?? 0);
    } else groups.push({ tool, count: 1, durationMs: tool.durationMs });
  }
  return groups;
}

function ToolStateIcon({ tool, state }: { tool: ToolRow; state: ToolState }) {
  if (state === 'pending') return <span className="spinner" />;
  if (state === 'stopped' || state === 'denied') return <Icon name="close" size={14} />;
  return <Icon name={state === 'error' ? 'alert' : (TOOL_ICON[tool.name] ?? 'code')} size={14} />;
}

export function DiffBadge({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="diff-badge tabular-nums" aria-label={`${added} lines added, ${removed} removed`}>
      {(added > 0 || removed === 0) && <span className="diff-plus">+{added}</span>}
      {removed > 0 && <span className="diff-minus">−{removed}</span>}
    </span>
  );
}

export function DiffView({ diff }: { diff: ToolDiff }) {
  if (diff.hunks.length === 0) return <p className="diff-empty text-xs">{diff.truncated ? 'The file is too large to show a diff.' : 'No line changes.'}</p>;
  return (
    <div className="diff-view" data-testid="diff-view">
      {diff.hunks.map((hunk, index) => {
        let oldLine = hunk.oldStart;
        let newLine = hunk.newStart;
        return (
          <div key={`${hunk.oldStart}-${hunk.newStart}-${index}`} className="diff-hunk">
            {index > 0 && <div className="diff-gap" aria-hidden="true">⋯</div>}
            {hunk.lines.map((line, lineIndex) => {
              const oldNo = line.kind === 'add' ? '' : String(oldLine++);
              const newNo = line.kind === 'del' ? '' : String(newLine++);
              return (
                <div key={lineIndex} className={`diff-line ${line.kind}`} data-kind={line.kind}>
                  <span className="diff-no" aria-hidden="true">{oldNo}</span>
                  <span className="diff-no" aria-hidden="true">{newNo}</span>
                  <span className="diff-sign" aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}</span>
                  <span className="diff-text">
                    {line.kind !== 'same' && <span className="sr-only">{line.kind === 'add' ? 'Added: ' : 'Removed: '}</span>}
                    {line.text || ' '}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
      {diff.truncated && <p className="diff-empty text-xs">The diff is cut short.</p>}
    </div>
  );
}

function ToolDetail({ tool, target, state }: { tool: ToolRow; target: string; state: ToolState }) {
  if (tool.diff) return <DiffView diff={tool.diff} />;
  const detail = tool.summary || (state === 'pending' ? 'Running' : '');
  return (
    <div className="flex flex-col gap-1 text-xs">
      {target && <span className="font-mono break-all text-foreground">{target}</span>}
      {detail && <span className={state === 'error' ? 'text-destructive wrap-anywhere' : 'wrap-anywhere'}>{detail}</span>}
    </div>
  );
}

function ToolItem({ group, workTree, running }: { group: RowGroup; workTree: string | null; running: boolean }) {
  const { tool, count } = group;
  const state = toolState(tool, running);
  const [open, setOpen] = useState<boolean | null>(null);
  const isSkill = tool.name === SKILL_TOOL;
  const target = toolSubject(tool.name, tool.input, workTree);
  return (
    <Action
      className={`tool-row ${state} ${isSkill ? 'skill-tool' : ''}`}
      data-state={state}
      data-tool={tool.name}
      open={open ?? state === 'error'}
      onOpenChange={(next) => setOpen(next)}
    >
      <ActionTrigger className="tool-trigger max-w-full min-w-0 py-0.5 text-xs" title={tool.summary || target || tool.name}>
        <ActionIcon className={STATE_TONE[state]}>
          <ToolStateIcon tool={tool} state={state} />
        </ActionIcon>
        <ActionLabel className={`tool-verb font-medium ${state === 'error' ? 'text-destructive' : isSkill ? 'text-primary' : ''}`}>{toolVerb(tool.name)}</ActionLabel>
        {target && (
          <Chip size="sm" className="tool-target min-w-0 truncate font-mono">
            {isSkill ? target : shortName(target)}
          </Chip>
        )}
        {count > 1 && <span className="tool-count tabular-nums">×{count}</span>}
        {tool.diff && <DiffBadge added={tool.diff.added} removed={tool.diff.removed} />}
        {state !== 'pending' && state !== 'stopped' && <span className="tool-ms shrink-0 tabular-nums">{formatMs(group.durationMs)}</span>}
        {state === 'denied' && <span className="tool-denied">Denied</span>}
        {STATE_WORD[state] && state !== 'denied' && <span className="sr-only">{STATE_WORD[state]}</span>}
      </ActionTrigger>
      <ActionContent className="pl-6">
        <ToolDetail tool={tool} target={target} state={state} />
      </ActionContent>
    </Action>
  );
}

function GroupSummary({ tools }: { tools: ToolRow[] }) {
  const errors = tools.filter((t) => t.isError).length;
  const total = tools.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  return (
    <>
      <span>
        {tools.length} tool call{tools.length === 1 ? '' : 's'}
      </span>
      {errors > 0 && <span className="text-destructive">{errors} failed</span>}
      {total > 0 && <span className="tabular-nums">{formatMs(total)}</span>}
    </>
  );
}

const COLLAPSE_AFTER = 5;

export function ToolChips({ tools, running, workTree, flat = false }: { tools: ToolRow[]; running: boolean; workTree: string | null; flat?: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  if (tools.length === 0) return null;
  const rows = (
    <div className="tool-list flex flex-col">
      {groupRepeats(tools, workTree).map((group) => (
        <ToolItem key={group.tool.toolUseId} group={group} workTree={workTree} running={running} />
      ))}
    </div>
  );
  if (flat || tools.length < COLLAPSE_AFTER) return <div className="tools tool-chips">{rows}</div>;
  const expanded = open ?? (running || tools.some((t) => t.isError));
  return (
    <ChainOfThought className="tools -ml-2" open={expanded} onOpenChange={(next) => setOpen(next)}>
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
}

export interface FileChange {
  path: string;
  added: number;
  removed: number;
  created: boolean;
}

export function fileChanges(tools: ToolRow[]): FileChange[] {
  const byPath = new Map<string, FileChange>();
  for (const tool of tools) {
    if (!tool.diff || tool.isError) continue;
    const entry = byPath.get(tool.diff.path) ?? { path: tool.diff.path, added: 0, removed: 0, created: false };
    entry.added += tool.diff.added;
    entry.removed += tool.diff.removed;
    entry.created ||= tool.diff.created;
    byPath.set(tool.diff.path, entry);
  }
  return [...byPath.values()];
}

export function ToolSummary({ tools, children }: { tools: ToolRow[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => toolTally(tools.map((tool) => tool.name)).map((item) => (item.count > 1 ? `${item.label} ×${item.count}` : item.label)).join(', '), [tools]);
  const failed = useMemo(() => tools.filter((tool) => tool.isError && !tool.denied).length, [tools]);
  if (tools.length === 0) return null;
  return (
    <div className="tool-summary" data-open={open || undefined} data-testid="tool-summary">
      <button type="button" className="tool-summary-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="tool-summary-icon" aria-hidden="true">
          <Icon name="sparkle" size={14} />
        </span>
        <span className="tool-summary-label">{label}</span>
        {failed > 0 && <span className="tool-summary-failed">{failed} failed</span>}
        <Icon name="chevronDown" size={14} className="tool-summary-caret" />
      </button>
      {open && <div className="tool-summary-body">{children}</div>}
    </div>
  );
}

function useElapsed(since: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return Math.max(0, now - since);
}

function statusLabel(run: RunView, workTree: string | null, now: number): string {
  if (run.permissions.length > 0) return 'Waiting for your answer';
  if (run.retry) {
    const seconds = Math.max(0, Math.ceil((run.retry.until - now) / 1000));
    return `Retrying in ${seconds}s (${run.retry.attempt}/${run.retry.max})`;
  }
  const pending = [...run.tools].reverse().find((t) => t.durationMs === null);
  if (pending) {
    const target = toolSubject(pending.name, pending.input, workTree);
    return `${LIVE_VERB[pending.name] ?? toolVerb(pending.name)}${target ? ` ${shortName(target)}` : ''}`;
  }
  const last = run.parts.at(-1);
  if (last?.kind === 'thinking' && last.open) return 'Thinking';
  if (last?.kind === 'text' && last.open) return 'Writing a reply';
  return run.parts.length > 0 ? 'Working' : 'Starting';
}

export function LiveStatus({ run, workTree }: { run: RunView; workTree: string | null }) {
  const elapsed = useElapsed(run.startedAt, true);
  return (
    <div className="ui-status live-status" data-testid="live-status">
      <span className="ui-status-mark" aria-hidden="true" />
      <span className="live-label min-w-0 truncate">{statusLabel(run, workTree, run.startedAt + elapsed)}</span>
      <span className="live-elapsed tabular-nums">{formatMs(Math.floor(elapsed / 1000) * 1000)}</span>
    </div>
  );
}
