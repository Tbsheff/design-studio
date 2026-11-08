import { lazy } from "react";

const DevNoteSlot = lazy(async () => {
  const loaded = await import("./dev-note-slot.js");

  return { default: loaded.DevNoteSlot };
});

export { useDevNoteHost } from "./use-dev-note-host.js";

export { DevNoteSlot };

export type {
  DevNoteHost,
  DevNoteHostOptions,
  DevNoteMenuItem,
  SelectSourceMessage,
} from "./use-dev-note-host.js";
