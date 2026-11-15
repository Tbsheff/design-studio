import { useCallback, useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import {
  PERCENT,
  toAlphaStep,
  toHueStep,
  toKeyDirection,
  toPadKey,
  toStep,
} from "./color-popup-model.js";
import type { Hsva } from "./color-popup-model.js";
import { useColorDrag } from "./use-color-drag.js";
import type { ColorPadDrag } from "./use-color-drag.js";
import type { ColorPopupState } from "./use-color-popup.js";

type ToKeyColor = (hsva: Hsva, key: string, isLarge: boolean) => Hsva | null;

interface ColorRange {
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handlePointerDown: () => void;
  readonly handlePointerUp: () => void;
}

interface ColorPadControl {
  readonly drag: ColorPadDrag;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

interface ColorControls {
  readonly alpha: ColorRange;
  readonly hue: ColorRange;
  readonly pad: ColorPadControl;
}

const useStepKeys = (
  popup: ColorPopupState,
  toNext: ToKeyColor
): ((event: KeyboardEvent<HTMLElement>) => void) => {
  const { commitColor, hsva } = popup;

  return useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      const next = toNext(hsva, event.key, event.shiftKey);

      if (next) {
        event.preventDefault();
        event.stopPropagation();
        commitColor(next);
      }
    },
    [commitColor, hsva, toNext]
  );
};

const toHueKey: ToKeyColor = (hsva, key, isLarge) => {
  const direction = toKeyDirection(key);

  if (direction === 0) {
    return null;
  }

  return toHueStep(hsva, direction * toStep(isLarge));
};

const toAlphaKey: ToKeyColor = (hsva, key, isLarge) => {
  const direction = toKeyDirection(key);

  if (direction === 0) {
    return null;
  }

  return toAlphaStep(hsva, direction * toStep(isLarge));
};

const toHueValue = (hsva: Hsva, value: number): Hsva => ({
  ...hsva,
  hue: value,
});

const toAlphaValue = (hsva: Hsva, value: number): Hsva => ({
  ...hsva,
  alpha: value / PERCENT,
});

const useColorRange = (
  popup: ColorPopupState,
  toValue: (hsva: Hsva, value: number) => Hsva,
  toKey: ToKeyColor
): ColorRange => {
  const { beginDrag, commitColor, endDrag, hsva, setColor } = popup;
  const isPointer = useRef(false);
  const handleKeyDown = useStepKeys(popup, toKey);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const next = toValue(hsva, Number(event.currentTarget.value));

      if (isPointer.current) {
        setColor(next);

        return;
      }

      commitColor(next);
    },
    [commitColor, hsva, setColor, toValue]
  );

  const handlePointerDown = useCallback((): void => {
    isPointer.current = true;
    beginDrag();
  }, [beginDrag]);

  const handlePointerUp = useCallback((): void => {
    isPointer.current = false;
    endDrag();
  }, [endDrag]);

  return { handleChange, handleKeyDown, handlePointerDown, handlePointerUp };
};

const useColorControls = (popup: ColorPopupState): ColorControls => ({
  alpha: useColorRange(popup, toAlphaValue, toAlphaKey),
  hue: useColorRange(popup, toHueValue, toHueKey),
  pad: {
    drag: useColorDrag(popup),
    handleKeyDown: useStepKeys(popup, toPadKey),
  },
});

export { useColorControls };

export type { ColorControls, ColorPadControl, ColorRange };
