import { lazy } from "react";

const PropSlot = lazy(async () => {
  const loaded = await import("./prop-slot.js");

  return { default: loaded.PropSlot };
});

export { copy as propCopy } from "./copy.js";

export { usePropHost } from "./use-prop-host.js";

export { PropSlot };

export type { PropSlotProps } from "./prop-slot.js";

export type {
  PropHost,
  PropHostOptions,
  PropMenuItem,
} from "./use-prop-host.js";
