import type { MatchKind } from "@design-studio/contracts";
import { useSyncExternalStore } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import {
  MATCH_NOTE_MS,
  MATCH_WAIT_MS,
  toMatchedText,
} from "./select-matching-model.js";

let matchNote: string | null = null;
let matchSeq = 0;
let noteTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const listeners = new Set<() => void>();

const updateMatchNote = (text: string | null): void => {
  if (noteTimer !== null) {
    globalThis.clearTimeout(noteTimer);
    noteTimer = null;
  }

  matchNote = text;

  if (text) {
    noteTimer = globalThis.setTimeout(() => {
      updateMatchNote(null);
    }, MATCH_NOTE_MS);
  }

  for (const listener of listeners) {
    listener();
  }
};

const startMatchWatch = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const getMatchNote = (): string | null => matchNote;

const runMatching = (
  port: PreviewPort,
  selector: string,
  by: MatchKind
): void => {
  matchSeq += 1;

  const requestId = `match-${matchSeq}`;
  let stop: (() => void) | null = null;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

  const done = (): void => {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }

    stop?.();
  };

  updateMatchNote(null);

  stop =
    port.listen?.((message) => {
      if (message.type !== "matched" || message.requestId !== requestId) {
        return;
      }

      done();
      updateMatchNote(toMatchedText(message));
    }) ?? null;

  timer = globalThis.setTimeout(done, MATCH_WAIT_MS);

  port.post({ by, requestId, selector, type: "select-matching" });
};

const useMatchNote = (): string | null =>
  useSyncExternalStore(startMatchWatch, getMatchNote);

export { runMatching, useMatchNote };
