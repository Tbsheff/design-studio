import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useSameAsDefault } from "./use-same-as-default.js";

const SameAsDefaultNote = ({
  projectId,
  frameId,
}: {
  readonly projectId: string;
  readonly frameId: string;
}): ReactElement | null => {
  const isSame = useSameAsDefault(projectId, frameId);

  if (!isSame) {
    return null;
  }

  return <span className="frame-same-note">{copy.sameAsDefault}</span>;
};

export { SameAsDefaultNote };
