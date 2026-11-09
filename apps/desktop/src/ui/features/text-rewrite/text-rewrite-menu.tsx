import { useMemo } from "react";
import type { ReactElement } from "react";

import type { SelectionContext } from "./deps.js";
import { RewriteField } from "./rewrite-field.js";

interface TextRewriteMenuProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly targets: SelectionContext[];
}

const TextRewriteMenu = ({
  directionId,
  projectId,
  targets,
}: TextRewriteMenuProps): ReactElement | null => {
  const [target] = targets;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  if (targets.length !== 1 || !target) {
    return null;
  }

  return <RewriteField ids={ids} target={target} />;
};

export { TextRewriteMenu };

export type { TextRewriteMenuProps };
