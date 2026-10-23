import { useEffect, useState } from 'react';
import { Action, ActionContent, ActionIcon, ActionLabel, ActionTrigger } from '../ai/components/ai/action';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtIcon,
} from '../ai/components/ai/chain-of-thought';
import { Chip } from '../ai/components/ai/chip';
import { Loader } from '../ai/components/ai/loader';
import { formatMs } from '../format';
import type { RunView, ToolRow } from '../runState';
import { SKILL_TOOL, prettyToolName, skillToolName, toolLabel, toolTarget } from '../toolLabels';
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
};

const TOOL_VERB: Record<string, string> = {
  Write: 'Writing',
  Edit: 'Editing',
  MultiEdit: 'Editing',
  Read: 'Reading',
  Bash: 'Running',
  Grep: 'Searching',
  Glob: 'Finding',
  Skill: 'Loading skill',
};

type ToolState = 'pending' | 'done' | 'error';

const STATE_TONE: Record<ToolState, string> = {
  pending: 'text-primary',
  done: 'text-muted-foreground',
  error: 'text-destructive',
};

function toolState(tool: ToolRow): ToolState {
  if (tool.durationMs === null) return 'pending';
  return tool.isError ? 'error' : 'done';
}

function shortName(target: string): string {
  const parts = target.split('/');
  return parts[parts.length - 1] || target;
}

function ToolStateIcon({ tool, state }: { tool: ToolRow; state: ToolState }) {
  if (state === 'pending') return <span className="spinner" />;
  return <Icon name={state === 'error' ? 'alert' : (TOOL_ICON[tool.name] ?? 'code')} size={14} />;
}

function ToolDetail({ tool, target, state }: { tool: ToolRow; target: string; state: ToolState }) {
  const detail = tool.summary || (state === 'pending' ? 'Running' : '');
  return (
    <div className="flex flex-col gap-1 text-xs">
      {target && <span className="font-mono break-all text-foreground">{target}</span>}
      {detail && <span className={state === 'error' ? 'text-destructive' : ''}>{detail}</span>}
    </div>
  );
}

function ToolItem({ tool, workTree }: { tool: ToolRow; workTree: string | null }) {
  const state = toolState(tool);
  const isSkill = tool.name === SKILL_TOOL;
  const target = isSkill ? '' : toolTarget(tool.input, workTree);
  return (
    <Action className={`tool-row ${state} ${isSkill ? 'skill-tool' : ''}`} data-state={state} data-tool={tool.name} title={tool.summary || target || tool.name}>
      <ActionTrigger className="max-w-full min-w-0 py-0.5 text-xs">
        <ActionIcon className={STATE_TONE[state]}>
          <ToolStateIcon tool={tool} state={state} />
        </ActionIcon>
        <ActionLabel className={`font-medium ${state === 'error' ? 'text-destructive' : isSkill ? 'text-primary' : ''}`}>{toolLabel(tool.name, tool.input)}</ActionLabel>
        {target && (
          <Chip size="sm" className="min-w-0 truncate font-mono">
            {shortName(target)}
          </Chip>
        )}
        {state !== 'pending' && <span className="shrink-0 tabular-nums">{formatMs(tool.durationMs)}</span>}
        {state === 'error' && <span className="sr-only">Error</span>}
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

export function ToolChips({ tools, running, workTree }: { tools: ToolRow[]; running: boolean; workTree: string | null }) {
  const [open, setOpen] = useState<boolean | null>(null);
  if (tools.length === 0) return null;
  const expanded = open ?? (running || tools.length <= 4);
  return (
    <ChainOfThought className="tools -ml-2" open={expanded} onOpenChange={(next) => setOpen(next)}>
      <ChainOfThoughtHeader className="tools-toggle text-xs">
        <ChainOfThoughtIcon>
          <Icon name="terminal" size={14} />
        </ChainOfThoughtIcon>
        <GroupSummary tools={tools} />
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="tool-chips">
        <div className="ml-4 flex flex-col gap-0.5 border-l border-border pl-3">
          {tools.map((t) => (
            <ToolItem key={t.toolUseId} tool={t} workTree={workTree} />
          ))}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThought>
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

function statusLabel(run: RunView, hasText: boolean, workTree: string | null): string {
  const pending = [...run.tools].reverse().find((t) => t.durationMs === null);
  if (pending) {
    const target = pending.name === SKILL_TOOL ? skillToolName(pending.input) : toolTarget(pending.input, workTree);
    return `${TOOL_VERB[pending.name] ?? `Using ${prettyToolName(pending.name).toLowerCase()}`}${target ? ` ${shortName(target)}` : ''}`;
  }
  if (hasText) return 'Writing a reply';
  if (run.thinking) return 'Thinking';
  return run.tools.length > 0 ? 'Working' : 'Starting';
}

export function LiveStatus({ run, hasText, workTree }: { run: RunView; hasText: boolean; workTree: string | null }) {
  const elapsed = useElapsed(run.startedAt, true);
  return (
    <div className="live-status flex min-w-0 items-center gap-2 text-sm">
      <Loader variant="shimmer" dots className="min-w-0 truncate text-foreground">
        {statusLabel(run, hasText, workTree)}
      </Loader>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{Math.floor(elapsed / 1000)}s</span>
    </div>
  );
}
