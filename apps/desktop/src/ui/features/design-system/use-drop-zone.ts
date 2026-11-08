import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, RefObject } from "react";

import { routeFiles, toSkippedNote } from "./nds-model.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";

interface DropZoneState {
  input: RefObject<HTMLInputElement | null>;
  isOver: boolean;
  note: string | null;
  openPicker: () => void;
  pickFiles: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  dropFiles: (event: DragEvent) => Promise<void>;
  dragOver: (event: DragEvent) => void;
  dragLeave: () => void;
}

const useDropZone = (
  form: DraftForm,
  set: (patch: Patch) => void
): DropZoneState => {
  const input = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const add = useCallback(
    async (files: File[]): Promise<void> => {
      const { patch, skipped } = await routeFiles(files, form);
      set(patch);
      setNote(toSkippedNote(skipped));
    },
    [form, set]
  );

  const dropFiles = useCallback(
    async (event: DragEvent): Promise<void> => {
      event.preventDefault();
      setIsOver(false);
      await add([...event.dataTransfer.files]);
    },
    [add]
  );

  const pickFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const { target } = event;
      await add([...(target.files ?? [])]);
      target.value = "";
    },
    [add]
  );

  const dragOver = useCallback((event: DragEvent): void => {
    event.preventDefault();
    setIsOver(true);
  }, []);

  const dragLeave = useCallback((): void => setIsOver(false), []);

  const openPicker = useCallback((): void => input.current?.click(), []);

  return {
    dragLeave,
    dragOver,
    dropFiles,
    input,
    isOver,
    note,
    openPicker,
    pickFiles,
  };
};

export { useDropZone };

export type { DropZoneState };
