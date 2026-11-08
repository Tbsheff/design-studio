import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, PointerEvent, RefObject } from "react";

import type { SizeMode } from "./sizing-model.js";

interface SizeEdit {
  readonly isEditing: boolean;
  readonly wrapRef: RefObject<HTMLDivElement | null>;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly start: () => void;
  readonly startFromPointer: (event: PointerEvent<HTMLInputElement>) => void;
  readonly leave: (event: FocusEvent<HTMLDivElement>) => void;
}

const useSizeEdit = (mode: SizeMode): SizeEdit => {
  const [editingMode, setEditingMode] = useState<SizeMode | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingMode === mode;
  const start = useCallback(() => setEditingMode(mode), [mode]);

  const startFromPointer = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      event.preventDefault();
      setEditingMode(mode);
    },
    [mode]
  );

  const leave = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;

    if (!(next instanceof Node && event.currentTarget.contains(next))) {
      setEditingMode(null);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  return { inputRef, isEditing, leave, start, startFromPointer, wrapRef };
};

export { useSizeEdit };

export type { SizeEdit };
