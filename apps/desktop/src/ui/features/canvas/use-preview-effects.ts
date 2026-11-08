import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useLayoutEffect } from "react";

import {
  clearTreeTimer,
  postMode,
  postTextAllowed,
  requestRectsFor,
} from "./preview-frames-core.js";
import { applyFilesChange, loadFresh } from "./preview-frames-swap.js";
import { flushSelectLatency } from "./preview-frames-telemetry.js";
import type { PreviewOptions, PreviewState } from "./preview-frames-types.js";

const clearStalePick = (
  state: PreviewState,
  selection: SelectionContext[]
): void => {
  const shown = state.picked.get();

  if (shown && shown !== selection) {
    state.picked.set(null);
  }
};

const usePreviewEffects = (
  state: PreviewState,
  options: PreviewOptions,
  frontToken: string | null
): void => {
  const { baseUrl, directionId, kind, lastChange, live } = options;
  const { marquee, selectMode, selection, textEditAllowed } = options;
  const selectorKey = selection.map((entry) => entry.selector).join("\n");

  useEffect(() => {
    loadFresh(state, baseUrl);
  }, [state, baseUrl]);

  useEffect(() => {
    applyFilesChange(state, { baseUrl, directionId, kind, lastChange, live });
  }, [state, baseUrl, directionId, kind, lastChange, live]);

  useEffect(() => {
    postMode(state, frontToken, selectMode, marquee === true);
  }, [state, selectMode, marquee, frontToken]);

  useEffect(() => {
    postTextAllowed(state, frontToken, textEditAllowed === true);
  }, [state, textEditAllowed, frontToken]);

  useEffect(() => {
    requestRectsFor(state, frontToken, selectorKey);
  }, [state, selectorKey, frontToken]);

  useLayoutEffect(() => {
    clearStalePick(state, selection);
    flushSelectLatency(state);
  }, [state, selection]);

  useEffect(() => (): void => clearTreeTimer(state), [state]);
};

export { usePreviewEffects };
