import type { RunLevel } from "@design-studio/contracts";
import { CopyButton, Icon } from "@design-studio/ui";
import { memo, useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  Exception,
  ExceptionHeader,
  ExceptionMessage,
  ExceptionType,
} from "../../ai/components/ai/exception.js";
import { Markdown } from "../../ai/components/ai/markdown.js";
import {
  Message,
  MessageContent,
  MessageText,
} from "../../ai/components/ai/message.js";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../../ai/components/ai/reasoning.js";
import { formatTime, formatUsd } from "../../domain/format.js";
import { splitMarkdownBlocks } from "../../domain/markdown-blocks.js";
import {
  ANSWERS_HEAD,
  CONTEXT_WARN,
  ERROR_HINTS,
  runLevel,
} from "./chat-parts-model.js";
import type {
  ClarifyAnswer,
  RunUndoAction,
  UserMessageSlots,
} from "./chat-parts-model.js";
import { contextShare } from "./context-meter.js";
import { copy } from "./copy.js";
import { levelLabel, levelHint } from "./level-control.js";
import type { RunView } from "./run-state-model.js";
import {
  skillsFromPrompt,
  withoutSkillLines,
  skillDisplayName,
} from "./skills-model.js";

const RunTitle = ({
  title,
  slot,
  onRename,
}: {
  title: string | undefined;
  slot: ReactNode;
  onRename: (() => void) | undefined;
}): ReactNode => {
  if (slot) {
    return slot;
  }

  if (!title) {
    return null;
  }

  return (
    <span
      className="run-title"
      data-testid="run-title"
      data-tip={onRename ? `${title} (double-click to rename)` : title}
      onDoubleClick={onRename}
    >
      {title}
    </span>
  );
};

const splitAnswers = (
  prompt: string
): {
  text: string;
  answers: ClarifyAnswer[];
} => {
  const at = prompt.lastIndexOf(ANSWERS_HEAD);

  if (at === -1) {
    return { answers: [], text: prompt };
  }

  const lines = prompt.slice(at + ANSWERS_HEAD.length).split("\n");
  const answers: ClarifyAnswer[] = [];

  for (const line of lines) {
    if (!line.startsWith("- ")) {
      return { answers: [], text: prompt };
    }

    const body = line.slice(2);
    const mark = body.indexOf("? ");
    answers.push(
      mark === -1
        ? { answer: body, question: "" }
        : { answer: body.slice(mark + 2), question: body.slice(0, mark + 1) }
    );
  }

  return { answers, text: prompt.slice(0, at) };
};

const AnsweredCard = ({
  answers,
}: {
  answers: ClarifyAnswer[];
}): ReactElement | null => {
  if (answers.length === 0) {
    return null;
  }

  return (
    <div className="msg-answered" data-testid="clarify-answers">
      <span className="msg-answered-head">
        <Icon name="check" size={12} />
        {copy.youAnswered}
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
};

const LevelChip = ({
  level,
}: {
  level: RunLevel | null;
}): ReactElement | null => {
  if (!level) {
    return null;
  }

  return (
    <span className={`ui-chip level-tag ${level}`} data-testid="run-level-chip">
      {levelLabel(level)}
    </span>
  );
};

const RequestChips = ({
  run,
  skills,
}: {
  run: RunView;
  skills: string[];
}): ReactElement | null => {
  const req = run.request;

  if (!req) {
    return null;
  }

  const selected = req.selection?.length ?? 0;
  const files = req.attachmentIds?.length ?? 0;
  const mode = req.mode === "critique" ? "Critique" : req.plan ? "Plan" : null;

  return (
    <div className="msg-chips">
      {req.task !== "design-system" && <LevelChip level={runLevel(run)} />}
      {mode && (
        <span className={`ui-chip mode-tag ${req.plan ? "plan" : req.mode}`}>
          {mode}
        </span>
      )}
      {selected > 0 && (
        <span className="ui-chip">
          <Icon name="pointer" size={12} />
          {selected}
          {copy.selected}
        </span>
      )}
      {files > 0 && (
        <span className="ui-chip">
          <Icon name="image" size={12} />
          {files}
          {copy.image}
          {files === 1 ? "" : "s"}
        </span>
      )}
      {skills.map((id) => (
        <span
          key={id}
          className="ui-chip skill-chip"
          data-tip={`Asked the agent to use the ${id} skill`}
        >
          <Icon name="book" size={12} />
          {skillDisplayName(id)}
        </span>
      ))}
    </div>
  );
};

const UserMessage = ({
  run,
  title,
  tools,
  replaceBody,
  titleSlot,
  onRename,
}: { run: RunView } & UserMessageSlots): ReactElement | null => {
  const req = run.request;

  if (!req) {
    return null;
  }

  if (req.retryOf) {
    return (
      <div
        className="msg-retry text-xs text-muted-foreground tabular-nums"
        data-testid="retry-marker"
      >
        <Icon name="undo" size={12} />
        {copy.retry}
        <time>{formatTime(run.startedAt)}</time>
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
            <span
              className="session-note"
              data-testid="session-note"
              data-tip={copy.theAgentStarts}
            >
              {run.summary.sessionNote}
            </span>
          )}
        </div>
        {replaceBody}
        {!replaceBody && (
          <div className="msg-user-row">
            {tools}
            <CopyButton
              text={req.prompt}
              label="Copy message"
              className="msg-copy"
            />
            <div className="msg-card">
              {text && (
                <MessageText className="msg-body whitespace-pre-wrap wrap-anywhere">
                  {text}
                </MessageText>
              )}
              <RequestChips run={run} skills={skills} />
            </div>
          </div>
        )}
        <AnsweredCard answers={answers} />
      </MessageContent>
    </Message>
  );
};

const MarkdownBlock = memo(({ text }: { text: string }) => (
  <Markdown>{text}</Markdown>
));
MarkdownBlock.displayName = "MarkdownBlock";

const AssistantText = memo(
  ({ text, streaming = false }: { text: string; streaming?: boolean }) => {
    const blocks = splitMarkdownBlocks(text);

    return (
      <MessageText
        className="msg-body assistant-text wrap-anywhere"
        data-streaming={streaming || null}
      >
        {blocks.map((block, index) => (
          <MarkdownBlock key={index} text={block} />
        ))}
      </MessageText>
    );
  }
);
AssistantText.displayName = "AssistantText";

const Thinking = memo(({ text, live }: { text: string; live: boolean }) => {
  if (!text && !live) {
    return null;
  }

  return (
    <Reasoning className="thinking" data-testid="thinking">
      <ReasoningTrigger className="text-xs">
        {live ? "Thinking…" : "Thought"}
      </ReasoningTrigger>
      <ReasoningContent>
        <p className="thinking-text whitespace-pre-wrap text-xs">{text}</p>
      </ReasoningContent>
    </Reasoning>
  );
});
Thinking.displayName = "Thinking";

const SentWhileRunning = ({ text }: { text: string }): ReactElement => (
  <div className="msg-inline-user" data-testid="sent-while-running">
    <span className="msg-inline-label">{copy.youWhileItRan}</span>
    <p className="whitespace-pre-wrap wrap-anywhere">{text}</p>
  </div>
);

const errorHint = (error: string): string => {
  const hit = ERROR_HINTS.find(([pattern]) => pattern.test(error));

  return hit
    ? hit[1]
    : "Retry, or change your message and send it again. Details has the full log.";
};

const undoRun = (undo: RunUndoAction, button: HTMLButtonElement): void => {
  if (undo.tip !== null) {
    return;
  }

  const next =
    button.parentElement?.querySelector<HTMLButtonElement>(
      ".btn:not(.ghost)"
    ) ??
    document.querySelector<HTMLElement>('.prompt [data-slot="composer-input"]');

  undo.onUndo();
  next?.focus();
};

const RunErrorActions = ({
  retry,
  undo,
}: {
  retry: (() => void) | undefined;
  undo: RunUndoAction | undefined;
}): ReactElement | null => {
  if (!retry && !undo) {
    return null;
  }

  return (
    <span className="run-retry flex items-center gap-1">
      {undo && (
        <button
          type="button"
          className="btn small ghost"
          aria-disabled={undo.tip !== null || undefined}
          data-tip={undo.tip ?? "Go back to the version before this run"}
          data-tip-side="top"
          onClick={(event) => undoRun(undo, event.currentTarget)}
        >
          {copy.undoItsChanges}
        </button>
      )}
      {retry && (
        <button type="button" className="btn small" onClick={retry}>
          {copy.retry2}
        </button>
      )}
    </span>
  );
};

const RunError = ({
  run,
  latest,
  onRetry,
  undo,
}: {
  run: RunView;
  latest: boolean;
  onRetry?: () => void;
  undo?: RunUndoAction;
}): ReactElement | null => {
  const error = run.summary?.error;
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error && latest) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error, latest]);

  if (!error || run.status === "budget_exceeded") {
    return null;
  }

  return (
    <Exception
      ref={ref}
      className="run-error"
      role="alert"
      data-long={error.length > 60 || undo !== undefined || undefined}
    >
      <ExceptionHeader className="run-error-head">
        <ExceptionType>{copy.error}</ExceptionType>
        <ExceptionMessage className="wrap-anywhere">{error}</ExceptionMessage>
        <RunErrorActions
          retry={latest && run.status !== "canceled" ? onRetry : undefined}
          undo={undo}
        />
      </ExceptionHeader>
      {run.status !== "canceled" && (
        <p className="run-error-hint">{errorHint(error)}</p>
      )}
    </Exception>
  );
};

const AlertIcon = (): ReactElement => <Icon name="alert" size={14} />;

const RunNotice = ({
  run,
  latest,
  onRetry,
}: {
  run: RunView;
  latest: boolean;
  onRetry?: () => void;
}): ReactElement | null => {
  if (run.status === "budget_exceeded") {
    const spent = run.summary ? ` after ${formatUsd(run.summary.costUsd)}` : "";

    return (
      <div
        className="ui-notice run-notice"
        role="status"
        data-testid="budget-notice"
      >
        <AlertIcon />
        <span className="run-notice-text">
          {copy.thisRunStoppedAt}
          {spent}
          {copy.raiseTheLimitIn}
        </span>
        {latest && onRetry && (
          <button
            type="button"
            className="btn ghost small run-retry"
            onClick={onRetry}
          >
            {copy.retry2}
          </button>
        )}
      </div>
    );
  }

  if (!latest || run.status === "running" || run.contextTokens === null) {
    return null;
  }

  const share = contextShare(run.contextTokens, run.summary?.model ?? "");

  if (share < CONTEXT_WARN) {
    return null;
  }

  return (
    <div
      className="ui-notice run-notice"
      role="status"
      data-testid="context-notice"
    >
      <AlertIcon />
      <span>
        {copy.thisChatUses}
        {Math.round(share * 100)}
        {copy.ofTheContextWindow}
      </span>
    </div>
  );
};

const PolishThis = ({
  disabled,
  onPolish,
}: {
  disabled: boolean;
  onPolish: () => void;
}): ReactElement => (
  <div className="polish-this flex items-center gap-2 text-xs text-muted-foreground">
    <button
      type="button"
      className="btn small has-icon"
      data-testid="polish-this"
      disabled={disabled}
      data-tip-side="top"
      data-tip-align="start"
      data-tip={levelHint("polish")}
      onClick={onPolish}
    >
      <Icon name="sparkle" size={14} />
      {copy.polishThis}
    </button>
    <span>{copy.runEveryCheckAnd}</span>
  </div>
);

const PlanCard = ({ onApprove }: { onApprove: () => void }): ReactElement => (
  <div
    className="plan-card"
    data-testid="plan-card"
    role="group"
    aria-label={copy.planReady}
  >
    <p>
      <strong>{copy.planReady2}</strong>
      {copy.noFilesChangedYet}
    </p>
    <div className="plan-actions">
      <button type="button" className="btn small primary" onClick={onApprove}>
        {copy.approveAndBuild}
      </button>
      <button
        type="button"
        className="btn small"
        onClick={() =>
          document
            .querySelector<HTMLTextAreaElement>(
              '.prompt [data-slot="composer-input"]'
            )
            ?.focus()
        }
      >
        {copy.keepPlanning}
      </button>
    </div>
  </div>
);

export {
  AssistantText,
  PlanCard,
  PolishThis,
  RunError,
  RunNotice,
  SentWhileRunning,
  Thinking,
  UserMessage,
  errorHint,
  splitAnswers,
};

export type { ClarifyAnswer };
