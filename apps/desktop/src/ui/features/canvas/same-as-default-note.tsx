import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useSameAsDefault } from "./use-same-as-default.js";

const SameAsDefaultNote = ({
  frameId,
  headVersionId,
  projectId,
}: {
  readonly frameId: string;
  readonly headVersionId: string | null;
  readonly projectId: string;
}): ReactElement | null => {
  const isSame = useSameAsDefault({ frameId, headVersionId, projectId });

  if (!isSame) {
    return null;
  }

  return <span className="frame-same-note">{copy.sameAsDefault}</span>;
};

export { SameAsDefaultNote };
