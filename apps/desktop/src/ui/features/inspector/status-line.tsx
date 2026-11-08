import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PropsStatus } from "./props-model.js";

interface StatusLineProps {
  readonly status: PropsStatus;
}

const StatusLine = ({ status }: StatusLineProps): ReactElement | null => {
  if (status.kind === "idle") {
    return null;
  }

  if (status.kind === "saving") {
    return <p className="ins-note prp-status">{copy.saving}</p>;
  }

  if (status.kind === "error") {
    return (
      <p className="ins-note prp-status error" role="alert">
        {status.text}
      </p>
    );
  }

  return <output className="ins-note prp-status">{status.text}</output>;
};

export { StatusLine };
