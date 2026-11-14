import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { toFlipAxis, toFlipChord } from "../../../shared/flip.js";
import type { FlipAxis } from "../../../shared/flip.js";
import { PREVIEW_ARRANGE_KEY_EVENT } from "../../platform/preview-key-events.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { rotationCopy } from "./copy.js";
import { useCommands } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import { isRotated, toFlippedScale } from "./flip-model.js";
import { useLatestRef } from "./use-latest-ref.js";
import { setEdit } from "./use-layout-keys.js";

interface Rotation {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly isShown: boolean;
}

type CommandEntry = ReturnType<Parameters<typeof useCommands>[0]>[number];

const ROTATE_COMMAND = "selection.rotate";

const toForwardedAxis = (event: Event): FlipAxis | null =>
  toFlipAxis(
    (event as CustomEvent<{ readonly key?: string }>).detail?.key ?? null
  );

const toKeyAxis = (event: KeyboardEvent): FlipAxis | null => {
  if (isTypingTarget(event.target)) {
    return null;
  }

  return toFlipAxis(toFlipChord(event));
};

const toRotationCommands = (
  flip: (axis: FlipAxis) => void,
  open: () => void
): CommandEntry[] => [
  {
    group: "Selection",
    icon: "compare",
    id: "selection.flip-h",
    keyId: "flip-h",
    keywords: rotationCopy.flipHKeywords,
    run: (): void => flip("x"),
    title: rotationCopy.flipH,
  },
  {
    group: "Selection",
    icon: "compare",
    id: "selection.flip-v",
    keyId: "flip-v",
    keywords: rotationCopy.flipVKeywords,
    run: (): void => flip("y"),
    title: rotationCopy.flipV,
  },
  {
    group: "Selection",
    icon: "reload",
    id: ROTATE_COMMAND,
    keywords: rotationCopy.rotateKeywords,
    run: open,
    title: rotationCopy.rotate,
  },
];

const useFlipKeys = (flip: (axis: FlipAxis) => void): void => {
  const latest = useLatestRef(flip);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const axis = toKeyAxis(event);

      if (axis) {
        event.preventDefault();
        latest.current(axis);
      }
    };

    const onForwarded = (event: Event): void => {
      const axis = toForwardedAxis(event);

      if (axis) {
        latest.current(axis);
      }
    };

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    };
  }, [latest]);
};

const useRotation = (edit: DirectEdit): Rotation => {
  const [isOpened, setIsOpened] = useState(false);
  const [focusCount, setFocusCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const flip = useCallback(
    (axis: FlipAxis): void => {
      setEdit(edit, { scale: toFlippedScale(edit.values.scale, axis) });
    },
    [edit]
  );

  const open = useCallback((): void => {
    setIsOpened(true);
    setFocusCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (focusCount === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return (): void => cancelAnimationFrame(frame);
  }, [focusCount]);

  useFlipKeys(flip);
  useCommands(() => toRotationCommands(flip, open));

  const isShown =
    isOpened || isRotated(edit.values.rotate) || edit.dirty.includes("rotate");

  return { inputRef, isShown };
};

export { useRotation };

export type { Rotation };
