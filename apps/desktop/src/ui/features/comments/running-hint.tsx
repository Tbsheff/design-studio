import type { ReactElement } from "react";

import { copy } from "./copy.js";

const RunningHint = ({
  isShown,
}: {
  isShown: boolean;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return <p className="comments-empty">{copy.textTheAgentIsRunning}</p>;
};

export { RunningHint };
