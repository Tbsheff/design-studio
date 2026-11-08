import type { Project } from "@design-studio/contracts";
import type { KeyboardEvent, RefObject } from "react";

import type { CardActions } from "./project-card-model.js";
import { useGridActions } from "./use-grid-actions.js";
import { useGridFocus } from "./use-grid-focus.js";
import { useGridShown } from "./use-grid-shown.js";

interface ProjectGridState {
  readonly matched: readonly Project[];
  readonly shown: readonly Project[];
  readonly first: Project | null;
  readonly favoriteIds: ReadonlySet<string>;
  readonly isFavoritesOnly: boolean;
  readonly view: "list" | "grid";
  readonly gridRef: RefObject<HTMLDivElement | null>;
  readonly active: string | null;
  readonly gridActions: CardActions;
  readonly setActiveId: (id: string) => void;
  readonly focusAt: (index: number) => void;
  readonly onGridKey: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly registerOpen: (id: string, button: HTMLButtonElement | null) => void;
}

const useProjectGridState = (
  projects: readonly Project[] | null,
  query: string,
  actions: CardActions,
  searchRef: RefObject<HTMLInputElement | null>
): ProjectGridState => {
  const { matched, shown, favoriteIds, isFavoritesOnly, view } = useGridShown(
    projects,
    query
  );

  const focus = useGridFocus(shown);
  const { gridRef, active, setActiveId, focusAt, onGridKey } = focus;
  const { registerOpen, openButtons } = focus;
  const [first = null] = shown;

  const gridActions = useGridActions({
    actions,
    gridRef,
    openButtons,
    searchRef,
    shown,
  });

  return {
    active,
    favoriteIds,
    first,
    focusAt,
    gridActions,
    gridRef,
    isFavoritesOnly,
    matched,
    onGridKey,
    registerOpen,
    setActiveId,
    shown,
    view,
  };
};

export { useProjectGridState };

export type { ProjectGridState };
