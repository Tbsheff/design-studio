import type { ReactElement } from "react";

import { SnapButton } from "./snap-button.js";
import type { TokenUi } from "./use-token-snap.js";

const SnapToggle = ({
  ui,
}: {
  readonly ui: TokenUi | null;
}): ReactElement | null => {
  if (!ui) {
    return null;
  }

  return <SnapButton ui={ui} />;
};

export { SnapToggle };
