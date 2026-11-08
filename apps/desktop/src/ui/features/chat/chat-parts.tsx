import { CopyButton, Icon } from "@design-studio/ui";
import { memo, useEffect, useRef } from "react";
import type { ReactElement } from "react";

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
import { AnsweredCard } from "./answered-card.js";
import { CONTEXT_WARN, errorHint, splitAnswers } from "./chat-parts-model.js";
import type { RunUndoAction, UserMessageSlots } from "./chat-parts-model.js";
import { focusPromptInput } from "./composer-focus.js";
import { contextShare } from "./context-meter.js";
import { copy } from "./copy.js";
import { RequestChips } from "./request-chips.js";
import type { RunView } from "./run-state-model.js";
import { RunTitle } from "./run-title.js";
import { skillsFromPrompt, withoutSkillLines } from "./skills-model.js";

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

const ALERT_ICON_SIZE = 14;
const PERCENT = 100;

const toSpentText = (run: RunView): string => {
  if (run.summary) {
    return ` after ${formatUsd(run.summary.costUsd)}`;
  }

  return "";
};

const BudgetNotice = ({
  run,
  latest,
  onRetry,
}: {
  run: RunView;
  latest: boolean;
  onRetry: (() => void) | undefined;
}): ReactElement => (
  <div
    className="ui-notice run-notice"
    role="status"
    data-testid="budget-notice"
  >
    <Icon name="alert" size={ALERT_ICON_SIZE} />
    <span className="run-notice-text">
      {copy.thisRunStoppedAt}
      {toSpentText(run)}
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

const ContextNotice = ({ share }: { share: number }): ReactElement => (
  <div
    className="ui-notice run-notice"
    role="status"
    data-testid="context-notice"
  >
    <Icon name="alert" size={ALERT_ICON_SIZE} />
    <span>
      {copy.thisChatUses}
      {Math.round(share * PERCENT)}
      {copy.ofTheContextWindow}
    </span>
  </div>
);

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
    return <BudgetNotice run={run} latest={latest} onRetry={onRetry} />;
  }

  if (!latest || run.status === "running" || run.contextTokens === null) {
    return null;
  }

  const share = contextShare(run.contextTokens, run.summary?.model ?? "");

  if (share < CONTEXT_WARN) {
    return null;
  }

  return <ContextNotice share={share} />;
};

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
      <button type="button" className="btn small" onClick={focusPromptInput}>
        {copy.keepPlanning}
      </button>
    </div>
  </div>
);

export { AssistantText, PlanCard, RunError, RunNotice, Thinking, UserMessage };
