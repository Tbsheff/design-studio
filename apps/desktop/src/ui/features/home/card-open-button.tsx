import type { PackSummary, Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { CardBody } from "./card-body.js";
import { CardPreview } from "./card-preview.js";
import type { AppHealth } from "./deps.js";
import { toTabIndex } from "./project-card-model.js";
import type { CardActions, PackSwatches } from "./project-card-model.js";

interface CardOpenButtonProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly homeDir: string | null;
  readonly isActive: boolean;
  readonly hasRunFailed: boolean;
  readonly thumb: string | null;
  readonly actions: CardActions;
  readonly ref: (button: HTMLButtonElement | null) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onFocusCard: () => void;
  readonly warmOpen: () => void;
  readonly warmOpenWithPreview: () => void;
}

const CardOpenButton = ({
  project,
  pack,
  toSwatches,
  health,
  homeDir,
  isActive,
  hasRunFailed,
  thumb,
  actions,
  ref,
  onKeyDown,
  onFocusCard,
  warmOpen,
  warmOpenWithPreview,
}: CardOpenButtonProps): ReactElement => {
  const open = useCallback((): void => {
    actions.onOpen(project);
  }, [actions, project]);

  const focus = useCallback((): void => {
    warmOpen();
    onFocusCard();
  }, [onFocusCard, warmOpen]);

  return (
    <button
      ref={ref}
      type="button"
      className="project-open"
      tabIndex={toTabIndex(isActive)}
      onClick={open}
      onPointerEnter={warmOpen}
      onPointerDown={warmOpenWithPreview}
      onFocus={focus}
      onKeyDown={onKeyDown}
    >
      <CardPreview project={project} thumb={thumb} />
      <CardBody
        project={project}
        pack={pack}
        toSwatches={toSwatches}
        health={health}
        homeDir={homeDir}
        hasRunFailed={hasRunFailed}
      />
    </button>
  );
};

export { CardOpenButton };
