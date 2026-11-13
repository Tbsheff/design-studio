import { Icon } from "@design-studio/ui";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { ExceptionMessage } from "../../ai/components/ai/exception-message.js";
import { Exception } from "../../ai/components/ai/exception.js";
import { errorHint, hasErrorCard } from "./chat-parts-model.js";
import type { RunUndoAction } from "./chat-parts-model.js";
import { RunErrorActions } from "./run-error-actions.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";

const ERROR_ICON_SIZE = 16;

const ErrorRoot = toStyled(Exception, "run-error");
const ErrorText = toStyled(ExceptionMessage, "run-error-text wrap-anywhere");

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
  onDetails,
  undo,
}: {
  run: RunView;
  latest: boolean;
  onRetry: (() => void) | null;
  onDetails: () => void;
  undo: RunUndoAction | null;
}): ReactElement | null => {
  const error = run.summary?.error ?? "";
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (error && latest) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error, latest]);

  if (!hasErrorCard(run)) {
    return null;
  }

  const hint = errorHint(error);

  return (
    <ErrorRoot ref={ref} role="alert">
      <span className="run-error-icon">
        <Icon name="alert" size={ERROR_ICON_SIZE} />
      </span>
      <ErrorText>{error}</ErrorText>
      {hint !== null && run.status !== "canceled" && (
        <p className="run-error-hint">{hint}</p>
      )}
      <RunErrorActions
        retry={toRetry(latest, run, onRetry)}
        undo={undo}
        onDetails={onDetails}
      />
    </ErrorRoot>
  );
};

export { RunError };
