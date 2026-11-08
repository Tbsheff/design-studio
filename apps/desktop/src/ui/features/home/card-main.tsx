import type { PackSummary, Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CardOpenButton } from "./card-open-button.js";
import { CardRenaming } from "./card-renaming.js";
import type { AppHealth } from "./deps.js";
import type { CardActions, PackSwatches } from "./project-card-model.js";
import { useLastRunFailure } from "./use-last-run-failed.js";
import type { ProjectCardState } from "./use-project-card.js";
import { useThumbnail } from "./use-thumbnail.js";

interface CardMainProps {
  readonly project: Project;
  readonly pack: PackSummary | null;
  readonly toSwatches: PackSwatches;
  readonly health: AppHealth | null;
  readonly homeDir: string | null;
  readonly isActive: boolean;
  readonly actions: CardActions;
  readonly card: Pick<
    ProjectCardState,
    | "finishRename"
    | "focusCard"
    | "isRenaming"
    | "onKeyDown"
    | "setOpenButton"
    | "warmOpen"
    | "warmOpenWithPreview"
  >;
}

const CardMain = ({
  project,
  pack,
  toSwatches,
  health,
  homeDir,
  isActive,
  actions,
  card,
}: CardMainProps): ReactElement => {
  const {
    finishRename,
    focusCard,
    isRenaming,
    onKeyDown,
    setOpenButton,
    warmOpen,
    warmOpenWithPreview,
  } = card;

  const thumb = useThumbnail(project);
  const { hasFailed } = useLastRunFailure(project);

  if (isRenaming) {
    return (
      <CardRenaming
        project={project}
        pack={pack}
        toSwatches={toSwatches}
        health={health}
        hasRunFailed={hasFailed}
        thumb={thumb}
        onDone={finishRename}
      />
    );
  }

  return (
    <CardOpenButton
      project={project}
      pack={pack}
      toSwatches={toSwatches}
      health={health}
      homeDir={homeDir}
      isActive={isActive}
      hasRunFailed={hasFailed}
      thumb={thumb}
      actions={actions}
      ref={setOpenButton}
      onKeyDown={onKeyDown}
      onFocusCard={focusCard}
      warmOpen={warmOpen}
      warmOpenWithPreview={warmOpenWithPreview}
    />
  );
};

export { CardMain };
