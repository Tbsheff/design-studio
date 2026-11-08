import { CopyButton } from "@design-studio/ui";
import { memo, useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { ExceptionHeader } from "../../ai/components/ai/exception-header.js";
import { ExceptionMessage } from "../../ai/components/ai/exception-message.js";
import { ExceptionType } from "../../ai/components/ai/exception-type.js";
import { Exception } from "../../ai/components/ai/exception.js";
import { Markdown } from "../../ai/components/ai/markdown.js";
import { MessageContent } from "../../ai/components/ai/message-content.js";
import { MessageText } from "../../ai/components/ai/message-text.js";
import { Message } from "../../ai/components/ai/message.js";
import { ReasoningContent } from "../../ai/components/ai/reasoning-content.js";
import { ReasoningTrigger } from "../../ai/components/ai/reasoning-trigger.js";
import { Reasoning } from "../../ai/components/ai/reasoning.js";
import { splitMarkdownBlocks } from "../../domain/markdown-blocks.js";
import { AnsweredCard } from "./answered-card.js";
import { errorHint, splitAnswers } from "./chat-parts-model.js";
import type { RunUndoAction, UserMessageSlots } from "./chat-parts-model.js";
import { copy } from "./copy.js";
import { RequestChips } from "./request-chips.js";
import { RetryMarker } from "./retry-marker.js";
import type { RunView } from "./run-state-model.js";
import { skillsFromPrompt, withoutSkillLines } from "./skills-model.js";
import { UserMessageMeta } from "./user-message-meta.js";

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
    return <RetryMarker startedAt={run.startedAt} />;
  }

  const skills = skillsFromPrompt(req.prompt);
  const { text: asked, answers } = splitAnswers(req.prompt);
  let text = asked.trim();

  if (skills.length > 0) {
    text = withoutSkillLines(asked).trim();
  }

  return (
    <Message type="outgoing" className="msg user">
      <MessageContent>
        <UserMessageMeta
          run={run}
          title={title}
          titleSlot={titleSlot}
          onRename={onRename}
        />
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

const toThinkingLabel = (live: boolean): string => {
  if (live) {
    return "Thinking…";
  }

  return "Thought";
};

const Thinking = memo(({ text, live }: { text: string; live: boolean }) => {
  if (!text && !live) {
    return null;
  }

  return (
    <Reasoning className="thinking" data-testid="thinking">
      <ReasoningTrigger className="text-xs">
        {toThinkingLabel(live)}
      </ReasoningTrigger>
      <ReasoningContent>
        <p className="thinking-text whitespace-pre-wrap text-xs">{text}</p>
      </ReasoningContent>
    </Reasoning>
  );
});

Thinking.displayName = "Thinking";

const LONG_ERROR_CHARS = 60;

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
  retry: (() => void) | null;
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
          aria-disabled={undo.tip !== null}
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

const toRetry = (
  latest: boolean,
  run: RunView,
  onRetry: (() => void) | undefined
): (() => void) | null => {
  if (latest && run.status !== "canceled" && onRetry) {
    return onRetry;
  }

  return null;
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
      data-long={error.length > LONG_ERROR_CHARS || undo !== undefined || null}
    >
      <ExceptionHeader className="run-error-head">
        <ExceptionType>{copy.error}</ExceptionType>
        <ExceptionMessage className="wrap-anywhere">{error}</ExceptionMessage>
        <RunErrorActions retry={toRetry(latest, run, onRetry)} undo={undo} />
      </ExceptionHeader>
      {run.status !== "canceled" && (
        <p className="run-error-hint">{errorHint(error)}</p>
      )}
    </Exception>
  );
};

export { AssistantText, RunError, Thinking, UserMessage };
