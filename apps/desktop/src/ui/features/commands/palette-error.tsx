import type { ReactElement } from "react";

import { Icon } from "./deps.js";

const PaletteError = ({
  error,
}: {
  error: string | null;
}): ReactElement | null => {
  if (!error) {
    return null;
  }

  return (
    <div className="cmdk-error" role="alert">
      <Icon name="alert" size={14} />
      <span>{error}</span>
    </div>
  );
};

export { PaletteError };
