import type { Project } from "@design-studio/contracts";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";

import type { CardActions } from "./project-card-model.js";

interface GridActionDeps {
  readonly actions: CardActions;
  readonly shown: readonly Project[];
  readonly gridRef: RefObject<HTMLDivElement | null>;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly openButtons: MutableRefObject<Map<string, HTMLButtonElement>>;
}

const useGridActions = ({
  actions,
  shown,
  gridRef,
  searchRef,
  openButtons,
}: GridActionDeps): CardActions => {
  const shownRef = useRef<readonly Project[]>(shown);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  return useMemo(() => {
    const focusNearest = (index: number): void => {
      const remaining = shownRef.current;
      const target = remaining[Math.min(index, remaining.length - 1)];
      const button = openButtons.current.get(target?.id ?? "");

      if (button) {
        button.focus();
      } else {
        searchRef.current?.focus();
      }
    };

    const onDelete = (project: Project): void => {
      const index = shownRef.current.findIndex(
        (item) => item.id === project.id
      );

      const hadFocus =
        gridRef.current?.contains(document.activeElement) ?? false;

      actions.onDelete(project);

      if (hadFocus) {
        globalThis.requestAnimationFrame(() => focusNearest(index));
      }
    };

    return { ...actions, onDelete };
  }, [actions, gridRef, openButtons, searchRef]);
};

export { useGridActions };
