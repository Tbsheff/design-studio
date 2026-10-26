import { memo, useEffect, useRef, type ReactNode } from 'react';
import type { RunLevel } from '../../shared/contracts';
import { Exception, ExceptionHeader, ExceptionMessage, ExceptionType } from '../ai/components/ai/exception';
import { Markdown } from '../ai/components/ai/markdown';
import { Message, MessageContent, MessageText } from '../ai/components/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../ai/components/ai/reasoning';
import { formatTime, formatUsd } from '../format';
import type { RunView } from '../runState';
import { contextShare } from './ContextMeter';
import { splitMarkdownBlocks } from '../markdownBlocks';
import { CopyButton } from './CopyButton';
import { skillDisplayName, skillsFromPrompt, withoutSkillLines } from '../skills';
import { Icon } from './Icon';
import { levelHint, levelLabel } from './LevelControl';

function runLevel(run: RunView): RunLevel | null {
  return run.summary?.level ?? run.request?.level ?? null;
}

function LevelChip({ level }: { level: RunLevel | null }) {
  if (!level) return null;
  return (
    <span className={`ui-chip level-tag ${level}`} data-testid="run-level-chip">
      {levelLabel(level)}
    </span>
  );
}

interface UserMessageSlots {
  title?: string | undefined;
  tools?: ReactNode;
  replaceBody?: ReactNode;
  titleSlot?: ReactNode;
  onRename?: () => void;
}

function RunTitle({ title, slot, onRename }: { title: string | undefined; slot: ReactNode; onRename: (() => void) | undefined }) {
  if (slot) return slot;
  if (!title) return null;
  return (
    <span className="run-title" data-testid="run-title" title={onRename ? `${title} (double-click to rename)` : title} onDoubleClick={onRename}>
      {title}
    </span>
  );
}

const ANSWERS_HEAD = '\n\nAnswers to your questions:\n';

export interface ClarifyAnswer {
  question: string;
  answer: string;
}

export function splitAnswers(prompt: string): { text: string; answers: ClarifyAnswer[] } {
  const at = prompt.lastIndexOf(ANSWERS_HEAD);
  if (at === -1) return { text: prompt, answers: [] };
  const lines = prompt.slice(at + ANSWERS_HEAD.length).split('\n');
  const answers: ClarifyAnswer[] = [];
  for (const line of lines) {
    if (!line.startsWith('- ')) return { text: prompt, answers: [] };
    const body = line.slice(2);
    const mark = body.indexOf('? ');
    answers.push(mark === -1 ? { question: '', answer: body } : { question: body.slice(0, mark + 1), answer: body.slice(mark + 2) });
  }
  return { text: prompt.slice(0, at), answers };
}

function AnsweredCard({ answers }: { answers: ClarifyAnswer[] }) {
  if (answers.length === 0) return null;
  return (
    <div className="msg-answered" data-testid="clarify-answers">
      <span className="msg-answered-head">
        <Icon name="check" size={12} />
        You answered
      </span>
      <dl className="msg-answered-list">
        {answers.map((item, index) => (
          <div key={index} className="msg-answered-row">
            {item.question && <dt>{item.question}</dt>}
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RequestChips({ run, skills }: { run: RunView; skills: string[] }) {
  const req = run.request;
  if (!req) return null;
  const selected = req.selection?.length ?? 0;
  const files = req.attachmentIds?.length ?? 0;
  const mode = req.mode === 'critique' ? 'Critique' : req.plan ? 'Plan' : null;
  return (
    <div className="msg-chips">
      <LevelChip level={runLevel(run)} />
      {mode && <span className={`ui-chip mode-tag ${req.plan ? 'plan' : req.mode}`}>{mode}</span>}
      {selected > 0 && (
        <span className="ui-chip">
          <Icon name="pointer" size={12} />
          {selected} selected
        </span>
      )}
      {files > 0 && (
        <span className="ui-chip">
          <Icon name="image" size={12} />
          {files} image{files === 1 ? '' : 's'}
        </span>
      )}
      {skills.map((id) => (
        <span key={id} className="ui-chip skill-chip" data-tip={`Asked the agent to use the ${id} skill`}>
          <Icon name="book" size={12} />
          {skillDisplayName(id)}
        </span>
      ))}
    </div>
  );
}

export function UserMessage({ run, title, tools, replaceBody, titleSlot, onRename }: { run: RunView } & UserMessageSlots) {
  const req = run.request;
  if (!req) return null;
  if (req.retryOf) {
    return (
      <div className="msg-retry text-xs text-muted-foreground tabular-nums" data-testid="retry-marker">
        <Icon name="undo" size={12} />
        Retry · <time>{formatTime(run.startedAt)}</time>
      </div>
    );
  }
  const skills = skillsFromPrompt(req.prompt);
  const { text: asked, answers } = splitAnswers(req.prompt);
  const text = (skills.length > 0 ? withoutSkillLines(asked) : asked).trim();
  return (
    <Message type="outgoing" className="msg user">
      <MessageContent>
        <div className="msg-meta flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <RunTitle title={title} slot={titleSlot} onRename={onRename} />
          <time>{formatTime(run.startedAt)}</time>
          {run.summary?.sessionNote && (
            <span className="session-note" data-testid="session-note" data-tip="The agent starts a new conversation because the files were restored to another version.">
              {run.summary.sessionNote}
            </span>
          )}
        </div>
        {replaceBody}
        {!replaceBody && (
          <div className="msg-user-row">
            {tools}
            <CopyButton text={req.prompt} label="Copy message" className="msg-copy" />
            <div className="msg-card">
              {text && <MessageText className="msg-body whitespace-pre-wrap wrap-anywhere">{text}</MessageText>}
              <RequestChips run={run} skills={skills} />
            </div>
          </div>
        )}
        <AnsweredCard answers={answers} />
      </MessageContent>
    </Message>
  );
}

const MarkdownBlock = memo(function MarkdownBlock({ text }: { text: string }) {
  return <Markdown>{text}</Markdown>;
});

export const AssistantText = memo(function AssistantText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = splitMarkdownBlocks(text);
  return (
    <MessageText className="msg-body assistant-text wrap-anywhere" data-streaming={streaming || undefined}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} text={block} />
      ))}
    </MessageText>
  );
});

export const Thinking = memo(function Thinking({ text, live }: { text: string; live: boolean }) {
  if (!text && !live) return null;
  return (
    <Reasoning className="thinking" data-testid="thinking">
      <ReasoningTrigger className="text-xs">{live ? 'Thinking…' : 'Thought'}</ReasoningTrigger>
      <ReasoningContent>
        <p className="thinking-text whitespace-pre-wrap text-xs">{text}</p>
      </ReasoningContent>
    </Reasoning>
  );
});

export function SentWhileRunning({ text }: { text: string }) {
  return (
    <div className="msg-inline-user" data-testid="sent-while-running">
      <span className="msg-inline-label">You, while it ran</span>
      <p className="whitespace-pre-wrap wrap-anywhere">{text}</p>
    </div>
  );
}

export function RunError({ run, latest, onRetry }: { run: RunView; latest: boolean; onRetry?: () => void }) {
  const error = run.summary?.error;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error && latest) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [error, latest]);
  if (!error || run.status === 'budget_exceeded') return null;
  return (
    <Exception ref={ref} className="run-error" role="alert">
      <ExceptionHeader className="run-error-head">
        <ExceptionType>Error</ExceptionType>
        <ExceptionMessage className="wrap-anywhere">{error}</ExceptionMessage>
        {latest && onRetry && run.status !== 'canceled' && (
          <button type="button" className="btn small run-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </ExceptionHeader>
    </Exception>
  );
}

const CONTEXT_WARN = 0.7;

function AlertIcon() {
  return <Icon name="alert" size={14} />;
}

export function RunNotice({ run, latest, onRetry }: { run: RunView; latest: boolean; onRetry?: () => void }) {
  if (run.status === 'budget_exceeded') {
    const spent = run.summary ? ` after ${formatUsd(run.summary.costUsd)}` : '';
    return (
      <div className="ui-notice run-notice" role="status" data-testid="budget-notice">
        <AlertIcon />
        <span className="run-notice-text">This run stopped at the spending limit{spent}. Raise the limit in Settings to let runs go further.</span>
        {latest && onRetry && (
          <button type="button" className="btn ghost small run-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (!latest || run.status === 'running' || run.contextTokens === null) return null;
  const share = contextShare(run.contextTokens, run.summary?.model ?? '');
  if (share < CONTEXT_WARN) return null;
  return (
    <div className="ui-notice run-notice" role="status" data-testid="context-notice">
      <AlertIcon />
      <span>
        This chat uses {Math.round(share * 100)}% of the context window. Start a new direction to keep runs fast and focused.
      </span>
    </div>
  );
}

export function PolishThis({ disabled, onPolish }: { disabled: boolean; onPolish: () => void }) {
  return (
    <div className="polish-this flex items-center gap-2 text-xs text-muted-foreground">
      <button type="button" className="btn small has-icon" data-testid="polish-this" disabled={disabled} data-tip-side="top" data-tip-align="start" data-tip={levelHint('polish')} onClick={onPolish}>
        <Icon name="sparkle" size={14} />
        Polish this
      </button>
      <span>Run every check on this version and fix what it finds.</span>
    </div>
  );
}

export function PlanCard({ onApprove }: { onApprove: () => void }) {
  return (
    <div className="plan-card" data-testid="plan-card" role="group" aria-label="Plan ready">
      <p>
        <strong>Plan ready.</strong> No files changed yet.
      </p>
      <div className="plan-actions">
        <button type="button" className="btn small primary" onClick={onApprove}>
          Approve and build
        </button>
        <button type="button" className="btn small" onClick={() => document.querySelector<HTMLTextAreaElement>('.prompt [data-slot="composer-input"]')?.focus()}>
          Keep planning
        </button>
      </div>
    </div>
  );
}
