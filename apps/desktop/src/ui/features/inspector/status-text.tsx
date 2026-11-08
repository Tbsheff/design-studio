import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SaveStatus } from "./use-direct-edit.js";

interface StatusTextProps {
  readonly status: SaveStatus;
}

const StatusText = ({ status }: StatusTextProps): ReactElement | null => {
  if (status.kind === "saving") {
    return <span className="ins-status saving">{copy.writing}</span>;
  }

  if (status.kind === "saved") {
    return (
      <span className="ins-status saved" data-tip={copy.writtenToTheFileSave}>
        {copy.written}
      </span>
    );
  }

  return null;
};

export { StatusText };
