import { useCallback } from "react";
import type { ReactElement } from "react";

import { toSubmitView } from "./comment-composer-model.js";
import { Icon } from "./deps.js";

const SubmitButton = ({
  toClaude,
  isBlocked,
  isSubmitting,
  onSubmit,
}: {
  toClaude: boolean;
  isBlocked: boolean;
  isSubmitting: boolean;
  onSubmit: (now: boolean) => void;
}): ReactElement => {
  const view = toSubmitView(toClaude);
  const submitLater = useCallback((): void => onSubmit(false), [onSubmit]);

  return (
    <button
      type="button"
      className={view.className}
      aria-label={view.label}
      aria-keyshortcuts="Enter"
      data-tip={view.tip}
      data-tip-side="top"
      disabled={isBlocked}
      onClick={submitLater}
    >
      {isSubmitting && <span className="spinner" />}
      {!isSubmitting && <Icon name={view.icon} size={14} />}
    </button>
  );
};

export { SubmitButton };
