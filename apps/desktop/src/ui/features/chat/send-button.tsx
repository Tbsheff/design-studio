import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { SEND_CLASS, SEND_ICON, SEND_LABEL } from "./prompt-box-model.js";
import type { SendProps, SendState } from "./prompt-box-model.js";
import { toSendView } from "./send-view-model.js";
import { useMorph } from "./use-morph.js";

const STOP_ICON_SIZE = 14;
const SEND_ICON_SIZE = 16;

const ICON_SIZE: Record<SendState, number> = {
  queue: SEND_ICON_SIZE,
  send: SEND_ICON_SIZE,
  stop: STOP_ICON_SIZE,
};

const toSendLabel = (state: SendState, isBusy: boolean): string => {
  if (isBusy) {
    return "Sending…";
  }

  return SEND_LABEL[state];
};

const SendButton = ({ send }: { send: SendProps }): ReactElement => {
  const view = toSendView(send);
  const handleSendOrStop = view.onClick;
  let key: "busy" | SendState = "busy";

  if (!view.busy) {
    key = view.state;
  }

  const hasMorphed = useMorph(key);
  let labelClass = "send-label";

  if (hasMorphed) {
    labelClass = "send-label morph";
  }

  return (
    <button
      type="button"
      className={SEND_CLASS[view.state]}
      data-state={key}
      disabled={view.disabled}
      onClick={handleSendOrStop}
      aria-label={toSendLabel(view.state, view.busy)}
      aria-busy={view.busy}
      aria-keyshortcuts={view.keys}
      data-tip={view.tip}
      data-tip-align="end"
      data-tip-side="top"
    >
      <span key={key} className={labelClass}>
        {view.busy && <span className="spinner" />}
        {!view.busy && (
          <Icon name={SEND_ICON[view.state]} size={ICON_SIZE[view.state]} />
        )}
      </span>
    </button>
  );
};

export { SendButton };
