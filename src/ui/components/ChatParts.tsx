import { useEffect, useRef } from 'react';
import type { RunLevel, RunStatus } from '../../shared/contracts';
import { Exception, ExceptionHeader, ExceptionMessage, ExceptionType } from '../ai/components/ai/exception';
import { Markdown } from '../ai/components/ai/markdown';
import { Message, MessageContent, MessageText } from '../ai/components/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../ai/components/ai/reasoning';
import { formatMs, formatTime, formatUsd } from '../format';
import type { RunView } from '../runState';
import { skillDisplayName, skillsFromPrompt, withoutSkillLines } from '../skills';
import { Icon } from './Icon';
import { levelHint, levelLabel } from './LevelControl';

const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  canceled: 'Canceled',
  failed: 'Failed',
  budget_exceeded: 'Spending limit reached',
};

function runLevel(run: RunView): RunLevel | null {
  return run.summary?.level ?? run.request?.level ?? null;
}

function LevelChip({ level }: { level: RunLevel | null }) {
  if (!level) return null;
  return (
    <span className={`badge level-tag ${level} ${level === 'polish' ? 'accent' : ''}`} data-testid="run-level-chip" title={levelHint(level)}>
      {levelLabel(level)}
    </span>
  );
}

export function UserMessage({ run }: { run: RunView }) {
  const req = run.request;
  if (!req) return null;
  const selected = req.selection?.length ?? 0;
  const critique = req.mode === 'critique';
  const skills = skillsFromPrompt(req.prompt);
  const text = skills.length > 0 ? withoutSkillLines(req.prompt) : req.prompt;
  return (
    <Message type="outgoing" className="msg user">
      <MessageContent>
        <div className="msg-meta flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span className={`badge mode-tag ${req.mode} ${critique ? 'warn' : ''}`}>{critique ? 'Critique' : 'Edit'}</span>
          <LevelChip level={runLevel(run)} />
          {selected > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="pointer" size={12} />
              {selected} selected
            </span>
          )}
          <time>{formatTime(run.startedAt)}</time>
          {run.summary?.sessionNote && (
            <span className="session-note" data-testid="session-note" title="The agent starts a new conversation because the files were restored to another version.">
              {run.summary.sessionNote}
            </span>
          )}
        </div>
        {text && (
          <MessageText variant="bubble" className="msg-body max-w-[92%] whitespace-pre-wrap wrap-anywhere">
            {text}
          </MessageText>
        )}
        {skills.length > 0 && (
          <div className="skill-chips msg-skills" aria-label="Skills requested">
            {skills.map((id) => (
              <span key={id} className="skill-chip" title={`Asked the agent to use the ${id} skill`}>
                <Icon name="book" size={12} />
                {skillDisplayName(id)}
              </span>
            ))}
          </div>
        )}
      </MessageContent>
    </Message>
  );
}

export function AssistantText({ text }: { text: string }) {
  return (
    <MessageText className="msg-body wrap-anywhere">
      <Markdown>{text}</Markdown>
    </MessageText>
  );
}

export function Thinking({ text, running }: { text: string; running: boolean }) {
  if (!text) return null;
  return (
    <Reasoning className="thinking">
      <ReasoningTrigger className="text-xs">{running ? 'Thinking…' : 'Thought'}</ReasoningTrigger>
      <ReasoningContent>
        <p className="whitespace-pre-wrap text-xs">{text}</p>
      </ReasoningContent>
    </Reasoning>
  );
}

export function RunError({ run, latest }: { run: RunView; latest: boolean }) {
  const error = run.summary?.error;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error && latest) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [error, latest]);
  if (!error) return null;
  return (
    <Exception ref={ref} className="run-error" role="alert">
      <ExceptionHeader className="h-auto min-h-11 items-start py-2.5">
        <ExceptionType>Error</ExceptionType>
        <ExceptionMessage className="wrap-anywhere">{error}</ExceptionMessage>
      </ExceptionHeader>
    </Exception>
  );
}

export function RunFoot({ run, onDetails }: { run: RunView; onDetails: () => void }) {
  const summary = run.summary;
  return (
    <div className="run-foot flex min-h-7 items-center gap-2 text-xs text-muted-foreground">
      <span className={`status ${run.status}`}>
        <span className="status-dot" aria-hidden="true" />
        {STATUS_LABEL[run.status]}
      </span>
      {summary && (
        <span className="tabular-nums" title={`$${summary.costUsd.toFixed(4)}`}>
          {formatMs(summary.durationMs)} · {formatUsd(summary.costUsd)}
        </span>
      )}
      <button type="button" className="btn ghost small run-foot-details" onClick={onDetails}>
        Details
      </button>
    </div>
  );
}

export function PolishThis({ disabled, onPolish }: { disabled: boolean; onPolish: () => void }) {
  return (
    <div className="polish-this flex items-center gap-2 text-xs text-muted-foreground">
      <button type="button" className="btn small has-icon" data-testid="polish-this" disabled={disabled} title={levelHint('polish')} onClick={onPolish}>
        <Icon name="sparkle" size={14} />
        Polish this
      </button>
      <span>Run every check on this version and fix what it finds.</span>
    </div>
  );
}
