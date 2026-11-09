import type { ReactElement } from "react";

import { TextRewriteMenu } from "./text-rewrite-menu.js";
import type { TextRewriteMenuProps } from "./text-rewrite-menu.js";

const TextRewriteSlot = ({
  directionId,
  projectId,
  targets,
}: TextRewriteMenuProps): ReactElement => (
  <TextRewriteMenu
    directionId={directionId}
    projectId={projectId}
    targets={targets}
  />
);

export { TextRewriteSlot };
