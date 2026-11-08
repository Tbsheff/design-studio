import type { Command } from "./registry.js";

const withDisabled = (command: Command, reason: string | null): Command => {
  if (reason === null) {
    return command;
  }

  return { ...command, disabled: reason };
};

const toReason = (isBlocked: boolean, reason: string): string | null => {
  if (isBlocked) {
    return reason;
  }

  return null;
};

const toTitle = (isOn: boolean, whenOn: string, whenOff: string): string => {
  if (isOn) {
    return whenOn;
  }

  return whenOff;
};

export { toReason, toTitle, withDisabled };
