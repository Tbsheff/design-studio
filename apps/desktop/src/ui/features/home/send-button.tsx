import type { ReactElement } from "react";

import { EMPTY_PROMPT, HOME_REASON_ID } from "./home-model.js";
import type { Busy } from "./home-model.js";
import { SendGlyph } from "./send-glyph.js";

const toSendLabel = (busy: Busy, label: string): string => {
  if (busy === "ask") {
    return "Thinking";
  }

  if (busy === "create") {
    return "Working";
  }

  return label;
};

const toSendTip = (
  isDisabled: boolean,
  reason: string | null,
  label: string
): string => {
  if (isDisabled && reason) {
    return reason;
  }

  return `${label}  ↩`;
};

const SendButton = ({
  busy,
  isDisabled,
  reason,
  label,
}: {
  readonly busy: Busy;
  readonly isDisabled: boolean;
  readonly reason: string | null;
  readonly label: string;
}): ReactElement => {
  const isWorking = busy === "create" || busy === "ask";

  return (
    <button
      className="icon-btn send home-send"
      type="submit"
      disabled={isDisabled}
      aria-busy={isWorking}
      aria-label={toSendLabel(busy, label)}
      data-tip={toSendTip(isDisabled, reason, label)}
      data-tip-align="end"
      data-tip-side="top"
    >
      <SendGlyph isWorking={isWorking} />
      {reason && reason !== EMPTY_PROMPT && (
        <span id={HOME_REASON_ID} className="sr-only">
          {reason}
        </span>
      )}
    </button>
  );
};

export { SendButton };
