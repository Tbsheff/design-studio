import { IS_MAC } from "../../chat-slots.js";
import { MOD_LABEL } from "./mod-label.js";
import type { SendProps, SendView } from "./prompt-box-model.js";

const QUEUE_TIP = `Queue (↵) · Send now (${MOD_LABEL}↵) · Stop (${MOD_LABEL}.)`;

const toStopKeys = (isMac: boolean): string => {
  if (isMac) {
    return "Meta+.";
  }

  return "Control+.";
};

const STOP_KEYS = toStopKeys(IS_MAC);

const toSendView = (props: SendProps): SendView => {
  if (props.running && !props.hasDraft) {
    return {
      busy: false,
      disabled: false,
      keys: STOP_KEYS,
      onClick: props.onStop,
      state: "stop",
      tip: `Stop (${MOD_LABEL}.)`,
    };
  }

  if (props.running) {
    return {
      busy: false,
      disabled: !props.canQueue,
      onClick: props.onQueue,
      state: "queue",
      tip: QUEUE_TIP,
    };
  }

  return {
    busy: props.sending,
    disabled: !props.canSend,
    onClick: props.onSend,
    state: "send",
    tip: props.tip,
  };
};

export { toSendView };
