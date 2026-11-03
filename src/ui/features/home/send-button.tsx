import { Icon } from "../../kit/Icon.js";
import { type Busy, EMPTY_PROMPT, HOME_REASON_ID } from "./home-model.js";

function SendButton({
  busy,
  disabled,
  reason,
  label,
}: {
  busy: Busy;
  disabled: boolean;
  reason: string | null;
  label: string;
}) {
  const working = busy === "create" || busy === "ask";

  return (
    <button
      className="icon-btn send home-send"
      type="submit"
      disabled={disabled}
      aria-busy={working || undefined}
      aria-label={
        busy === "ask" ? "Thinking" : busy === "create" ? "Working" : label
      }
      data-tip={disabled && reason ? reason : `${label}  ↩`}
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
}

export { SendButton };
