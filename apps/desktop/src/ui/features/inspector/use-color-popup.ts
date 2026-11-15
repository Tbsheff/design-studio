import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

import { toColorText, toHsvaOf } from "./color-popup-model.js";
import type { Hsva, PageColor } from "./color-popup-model.js";
import { useColorAnchor } from "./use-color-dismiss.js";
import { useColorPage } from "./use-color-page.js";
import { useDragEscape, usePreviewFrame } from "./use-color-preview.js";

type View = "color";

interface ColorTarget {
  readonly value: string;
  readonly onPreview: ((value: string) => void) | null;
  readonly onCommit: (value: string) => void;
  readonly onRevert: ((base: string) => void) | null;
}

interface ColorPopupState {
  readonly hsva: Hsva;
  readonly isOpen: boolean;
  readonly pad: RefObject<HTMLButtonElement | null>;
  readonly pageColors: PageColor[];
  readonly panel: RefObject<HTMLElement | null>;
  readonly popStyle: CSSProperties;
  readonly trigger: RefObject<HTMLSpanElement | null>;
  readonly beginDrag: () => void;
  readonly endDrag: () => void;
  readonly handleToggle: () => void;
  readonly setColor: (next: Hsva) => void;
  readonly commitColor: (next: Hsva) => void;
  readonly commitValue: (value: string) => void;
}

interface ColorDragState {
  readonly beginDrag: () => void;
  readonly endDrag: () => void;
  readonly setColor: (next: Hsva) => void;
}

const toFieldAnchor = (trigger: HTMLElement): HTMLElement =>
  trigger.closest<HTMLElement>(".ins-field") ?? trigger;

const useColorDragState = (
  target: ColorTarget,
  current: RefObject<Hsva>,
  write: (next: Hsva) => void
): ColorDragState => {
  const isDragging = useRef(false);
  const base = useRef(target.value);
  const preview = usePreviewFrame(target.onPreview);
  const { onCommit, onRevert, value } = target;

  const setColor = useCallback(
    (next: Hsva): void => {
      write(next);

      if (isDragging.current) {
        preview.schedule(toColorText(next));
      }
    },
    [preview, write]
  );

  const beginDrag = useCallback((): void => {
    isDragging.current = true;
    base.current = value;
  }, [value]);

  const endDrag = useCallback((): void => {
    if (!isDragging.current) {
      return;
    }

    isDragging.current = false;
    preview.stop();
    onCommit(toColorText(current.current));
  }, [preview, onCommit, current]);

  const cancelDrag = useCallback((): void => {
    isDragging.current = false;
    preview.stop();
    onRevert?.(base.current);
  }, [preview, onRevert]);

  useDragEscape(isDragging, cancelDrag);

  return { beginDrag, endDrag, setColor };
};

const useColorPopup = (target: ColorTarget): ColorPopupState => {
  const pop = useColorAnchor<View>(toFieldAnchor);
  const { close, open, panel, trigger, style: popStyle } = pop;
  const isOpen = pop.view !== null;
  const [hsva, setHsva] = useState<Hsva>(() => toHsvaOf(target.value));
  const current = useRef<Hsva>(hsva);
  const pad = useRef<HTMLButtonElement | null>(null);
  const pageColors = useColorPage(isOpen);
  const { onCommit, value } = target;

  const write = useCallback((next: Hsva): void => {
    current.current = next;
    setHsva(next);
  }, []);

  const drag = useColorDragState(target, current, write);

  const commitColor = useCallback(
    (next: Hsva): void => {
      write(next);
      onCommit(toColorText(next));
    },
    [onCommit, write]
  );

  const commitValue = useCallback(
    (next: string): void => {
      write(toHsvaOf(next));
      onCommit(next);
    },
    [onCommit, write]
  );

  const handleToggle = useCallback((): void => {
    if (isOpen) {
      close(true);

      return;
    }

    write(toHsvaOf(value));
    open("color");
  }, [isOpen, close, open, value, write]);

  useEffect(() => {
    if (isOpen) {
      pad.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  return {
    ...drag,
    commitColor,
    commitValue,
    handleToggle,
    hsva,
    isOpen,
    pad,
    pageColors,
    panel,
    popStyle,
    trigger,
  };
};

export { useColorPopup };

export type { ColorPopupState, ColorTarget };
