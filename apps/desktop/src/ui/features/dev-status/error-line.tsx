import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ErrorLineProps {
  readonly error: Error | null;
}

const ErrorLine = ({ error }: ErrorLineProps): ReactElement | null => {
  if (error === null) {
    return null;
  }

  return <p className="ui-error">{copy.failed}</p>;
};

export { ErrorLine };
