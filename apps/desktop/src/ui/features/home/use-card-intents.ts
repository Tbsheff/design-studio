import type { Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { toCardKeyIntent } from "./project-card-model.js";
import type { CardAction, CardActions } from "./project-card-model.js";

interface CardIntentDeps {
  readonly project: Project;
  readonly actions: CardActions;
  readonly closeMenu: (shouldRefocus: boolean) => void;
  readonly openKeyMenu: () => void;
  readonly startRename: () => void;
}

interface CardIntents {
  readonly pick: (action: CardAction) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const useCardIntents = ({
  project,
  actions,
  closeMenu,
  openKeyMenu,
  startRename,
}: CardIntentDeps): CardIntents => {
  const pick = useCallback(
    (action: CardAction): void => {
      closeMenu(action === "duplicate" || action === "reveal");

      const runners: Record<CardAction, () => void> = {
        delete: (): void => actions.onDelete(project),
        duplicate: (): void => actions.onDuplicate(project),
        open: (): void => actions.onOpen(project),
        rename: startRename,
        reveal: (): void => actions.onReveal(project),
      };

      runners[action]();
    },
    [actions, closeMenu, project, startRename]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      const intent = toCardKeyIntent({
        hasMod: event.metaKey || event.ctrlKey,
        isShift: event.shiftKey,
        key: event.key,
      });

      if (intent === null) {
        return;
      }

      event.preventDefault();

      const runners: Record<NonNullable<typeof intent>, () => void> = {
        delete: (): void => actions.onDelete(project),
        duplicate: (): void => actions.onDuplicate(project),
        menu: openKeyMenu,
        rename: startRename,
      };

      runners[intent]();
    },
    [actions, openKeyMenu, project, startRename]
  );

  return { onKeyDown, pick };
};

export { useCardIntents };
