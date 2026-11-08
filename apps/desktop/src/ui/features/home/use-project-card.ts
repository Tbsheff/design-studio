import type { Project } from "@design-studio/contracts";
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";

import type { CardAction, CardActions, MenuAt } from "./project-card-model.js";
import { toClassName } from "./project-card-model.js";
import { useCardIntents } from "./use-card-intents.js";
import { useCardMenu } from "./use-card-menu.js";
import { useCardWarm } from "./use-card-warm.js";

interface ProjectCardState {
  readonly menu: MenuAt;
  readonly className: string;
  readonly focusCard: () => void;
  readonly isRenaming: boolean;
  readonly cardRef: RefObject<HTMLDivElement | null>;
  readonly setOpenButton: (button: HTMLButtonElement | null) => void;
  readonly closeMenu: (shouldRefocus: boolean) => void;
  readonly pick: (action: CardAction) => void;
  readonly onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly finishRename: (name: string | null) => void;
  readonly toggleMenu: () => void;
  readonly warmOpen: () => void;
  readonly warmOpenWithPreview: () => void;
}

interface ProjectCardDeps {
  readonly project: Project;
  readonly actions: CardActions;
  readonly isFavorite: boolean;
  readonly onFocusCard: (projectId: string) => void;
  readonly onRegisterOpen: (
    id: string,
    button: HTMLButtonElement | null
  ) => void;
}

const useProjectCard = ({
  project,
  actions,
  isFavorite,
  onFocusCard,
  onRegisterOpen,
}: ProjectCardDeps): ProjectCardState => {
  const [isRenaming, setIsRenaming] = useState(false);
  const openRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { menu, closeMenu, openKeyMenu, toggleMenu, onContextMenu } =
    useCardMenu(cardRef, openRef);

  const startRename = useCallback((): void => {
    setIsRenaming(true);
  }, []);

  const { pick, onKeyDown } = useCardIntents({
    actions,
    closeMenu,
    openKeyMenu,
    project,
    startRename,
  });

  const setOpenButton = useCallback(
    (button: HTMLButtonElement | null): void => {
      openRef.current = button;
      onRegisterOpen(project.id, button);
    },
    [onRegisterOpen, project.id]
  );

  const finishRename = useCallback(
    (name: string | null): void => {
      setIsRenaming(false);
      globalThis.requestAnimationFrame(() => openRef.current?.focus());

      if (name) {
        void actions.onRename(project, name);
      }
    },
    [actions, project]
  );

  const focusCard = useCallback((): void => {
    onFocusCard(project.id);
  }, [onFocusCard, project.id]);

  const className = toClassName(
    "project-card",
    menu !== null && "menu-open",
    isFavorite && "favorite"
  );

  const { warmOpen, warmOpenWithPreview } = useCardWarm(project);

  return {
    cardRef,
    className,
    closeMenu,
    finishRename,
    focusCard,
    isRenaming,
    menu,
    onContextMenu,
    onKeyDown,
    pick,
    setOpenButton,
    toggleMenu,
    warmOpen,
    warmOpenWithPreview,
  };
};

export { useProjectCard };

export type { ProjectCardState };
