import { Icon } from "@design-studio/ui";

import { EMPTY_PROMPT, HOME_REASON_ID } from "./home-model.js";
import type { Busy } from "./home-model.js";

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
}) => {
  const working = busy === "create" || busy === "ask";

  return (
    <button
      className="icon-btn send home-send"
      type="submit"
      disabled={isDisabled}
      aria-busy={working || undefined}
      aria-label={
        busy === "ask" ? "Thinking" : busy === "create" ? "Working" : label
      }
      data-tip={isDisabled && reason ? reason : `${label}  ↩`}
      data-tip-align="end"
      data-tip-side="top"
    >
      <span key={working ? "busy" : "idle"} className="home-send-glyph">
        {working ? (
          <span className="spinner" />
        ) : (
          <Icon name="arrowUp" size={16} />
        )}
      </span>
      {reason && reason !== EMPTY_PROMPT && (
        <span id={HOME_REASON_ID} className="sr-only">
          {reason}
        </span>
      )}
    </button>
  );
};

export { SendButton };
