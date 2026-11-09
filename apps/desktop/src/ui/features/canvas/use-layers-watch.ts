import { selectMoveOf } from "@design-studio/contracts";
import type { SelectMove, SelectionContext } from "@design-studio/contracts";
import { useEffect, useEffectEvent } from "react";

import { canvasHasKeys } from "../../platform/typing-target.js";

const useLayersWatch = (
  watch: (on: boolean, token: string | null) => void,
  open: boolean,
  frontToken: string | null
): void => {
  useEffect(() => {
    watch(open, frontToken);
  }, [watch, open, frontToken]);
};

const useSelectMoveKeys = (
  selectMode: boolean,
  selection: SelectionContext[],
  selectRelative: (selector: string, move: SelectMove) => void
): void => {
  const handleKey = useEffectEvent((eventValue: KeyboardEvent): void => {
    const last = selection.at(-1);

    if (!selectMode || !last || !canvasHasKeys()) {
      return;
    }

    const move = selectMoveOf(eventValue);

    if (!move) {
      return;
    }

    eventValue.preventDefault();
    selectRelative(last.selector, move);
  });

  useEffect(() => {
    const onKey = (eventValue: KeyboardEvent): void => handleKey(eventValue);

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

export { useLayersWatch, useSelectMoveKeys };
