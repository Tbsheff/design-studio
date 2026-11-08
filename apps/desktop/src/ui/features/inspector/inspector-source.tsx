import type { SourceLoc } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { SourceButton } from "./source-button.js";

const SourceLink = ({
  projectId,
  directionId,
  source,
}: {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly source: SourceLoc | null;
}): ReactElement => {
  if (!source) {
    return <span className="ins-source" />;
  }

  return (
    <SourceButton
      projectId={projectId}
      directionId={directionId}
      source={source}
    />
  );
};

export { SourceLink };
