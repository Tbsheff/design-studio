import type { Project } from "@design-studio/contracts";
import { Suspense } from "react";
import type { ReactElement } from "react";

import { CardMenu } from "./card-menus-model.js";
import type { CardAction, MenuAt } from "./project-card-model.js";
import { toFolderPlace } from "./project-card-model.js";

interface CardMenuHostProps {
  readonly project: Project;
  readonly homeDir: string | null;
  readonly at: Exclude<MenuAt, null>;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly onPick: (action: CardAction) => void;
}

const CardMenuHost = ({
  project,
  homeDir,
  at,
  onClose,
  onPick,
}: CardMenuHostProps): ReactElement => (
  <Suspense fallback={null}>
    <CardMenu
      project={project}
      place={toFolderPlace(project, homeDir)}
      at={at}
      onClose={onClose}
      onPick={onPick}
    />
  </Suspense>
);

export { CardMenuHost };
