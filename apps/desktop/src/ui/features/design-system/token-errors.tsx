import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const TokenErrors = ({ errors }: { errors: string[] }): ReactElement | null => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul
      className="alert error small ds-errors"
      aria-label={COPY.labelDesignSystemErrors}
    >
      {errors.map((err) => (
        <li key={err}>{err}</li>
      ))}
    </ul>
  );
};

export { TokenErrors };
