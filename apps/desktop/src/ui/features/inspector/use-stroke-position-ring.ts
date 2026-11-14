import { useCallback } from "react";
import type { FocusEvent, KeyboardEvent } from "react";

import type { RingStroke } from "./stroke-position-model.js";

interface RingInputs {
  readonly blurColor: (event: FocusEvent<HTMLInputElement>) => void;
  readonly blurWidth: (event: FocusEvent<HTMLInputElement>) => void;
  readonly keyColor: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly keyWidth: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const isCommitKey = (event: KeyboardEvent<HTMLInputElement>): boolean =>
  event.key === "Enter" && !event.nativeEvent.isComposing;

const useStrokePositionRing = (
  ring: RingStroke,
  onRingColor: (color: string) => void,
  onRingWidth: (width: number) => void
): RingInputs => {
  const settleWidth = useCallback(
    (text: string) => {
      const next = Number(text.trim());

      if (text.trim() !== "" && Number.isFinite(next) && next !== ring.width) {
        onRingWidth(next);
      }
    },
    [onRingWidth, ring.width]
  );

  const settleColor = useCallback(
    (text: string) => {
      const next = text.trim();

      if (next !== "" && next !== ring.color) {
        onRingColor(next);
      }
    },
    [onRingColor, ring.color]
  );

  const blurWidth = useCallback(
    (event: FocusEvent<HTMLInputElement>) =>
      settleWidth(event.currentTarget.value),
    [settleWidth]
  );

  const blurColor = useCallback(
    (event: FocusEvent<HTMLInputElement>) =>
      settleColor(event.currentTarget.value),
    [settleColor]
  );

  const keyWidth = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (isCommitKey(event)) {
        settleWidth(event.currentTarget.value);
      }
    },
    [settleWidth]
  );

  const keyColor = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (isCommitKey(event)) {
        settleColor(event.currentTarget.value);
      }
    },
    [settleColor]
  );

  return { blurColor, blurWidth, keyColor, keyWidth };
};

export { useStrokePositionRing };

export type { RingInputs };
