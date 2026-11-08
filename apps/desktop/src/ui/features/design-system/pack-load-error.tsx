import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PackLoadError = ({
  error,
}: {
  error: string | null;
}): ReactElement | null => {
  if (!error) {
    return null;
  }

  return (
    <div className="alert error small">
      {COPY.textCouldNotLoadDesign}
      {error}
    </div>
  );
};

export { PackLoadError };
