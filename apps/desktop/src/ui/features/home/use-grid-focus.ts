import type { Project } from "@design-studio/contracts";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, MutableRefObject, RefObject } from "react";

import { toGridColumns, toNextGridIndex } from "./project-list-model.js";

interface GridFocus {
  readonly active: string | null;
  readonly gridRef: RefObject<HTMLDivElement | null>;
  readonly openButtons: MutableRefObject<Map<string, HTMLButtonElement>>;
  readonly focusAt: (index: number) => void;
  readonly onGridKey: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly registerOpen: (id: string, button: HTMLButtonElement | null) => void;
  readonly setActiveId: (id: string) => void;
}

const toActiveId = (
  shown: readonly Project[],
  activeId: string | null
): string | null => {
  if (shown.some((project) => project.id === activeId)) {
    return activeId;
  }

  return shown[0]?.id ?? null;
};

const useGridFocus = (shown: readonly Project[]): GridFocus => {
  const gridRef = useRef<HTMLDivElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = toActiveId(shown, activeId);

  const registerOpen = useCallback(
    (id: string, button: HTMLButtonElement | null): void => {
      if (button) {
        openButtons.current.set(id, button);
      } else {
        openButtons.current.delete(id);
      }
    },
    []
  );

  const focusAt = useCallback(
    (index: number): void => {
      const target = shown[index];

      if (!target) {
        return;
      }

      setActiveId(target.id);
      openButtons.current.get(target.id)?.focus();
    },
    [shown]
  );

  const onGridKey = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (
        !(event.target instanceof HTMLElement) ||
        !event.target.classList.contains("project-open")
      ) {
        return;
      }

      const next = toNextGridIndex(
        event.key,
        shown.findIndex((project) => project.id === active),
        shown.length,
        toGridColumns(gridRef.current)
      );

      if (next === null) {
        return;
      }

      event.preventDefault();
      focusAt(next);
    },
    [active, focusAt, shown]
  );

  return {
    active,
    focusAt,
    gridRef,
    onGridKey,
    openButtons,
    registerOpen,
    setActiveId,
  };
};

export { useGridFocus };

export type { GridFocus };
