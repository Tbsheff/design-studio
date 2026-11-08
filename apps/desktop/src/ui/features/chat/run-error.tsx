import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { ExceptionHeader } from "../../ai/components/ai/exception-header.js";
import { ExceptionMessage } from "../../ai/components/ai/exception-message.js";
import { ExceptionType } from "../../ai/components/ai/exception-type.js";
import { Exception } from "../../ai/components/ai/exception.js";
import { errorHint } from "./chat-parts-model.js";
import type { RunUndoAction } from "./chat-parts-model.js";
import { copy } from "./copy.js";
import { RunErrorActions } from "./run-error-actions.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";

const LONG_ERROR_CHARS = 60;

const ErrorRoot = toStyled(Exception, "run-error");
const ErrorHead = toStyled(ExceptionHeader, "run-error-head");
const ErrorText = toStyled(ExceptionMessage, "wrap-anywhere");

const toRetry = (
  latest: boolean,
  run: RunView,
  onRetry: (() => void) | null
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
  onRetry: (() => void) | null;
  undo: RunUndoAction | null;
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
    <ErrorRoot
      ref={ref}
      role="alert"
      data-long={error.length > LONG_ERROR_CHARS || undo !== null || null}
    >
      <ErrorHead>
        <ExceptionType>{copy.error}</ExceptionType>
        <ErrorText>{error}</ErrorText>
        <RunErrorActions retry={toRetry(latest, run, onRetry)} undo={undo} />
      </ErrorHead>
      {run.status !== "canceled" && (
        <p className="run-error-hint">{errorHint(error)}</p>
      )}
    </ErrorRoot>
  );
};

export { RunError };
