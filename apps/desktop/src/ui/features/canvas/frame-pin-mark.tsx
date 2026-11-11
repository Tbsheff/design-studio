import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const FramePinMark = (): ReactElement => (
  <span className="frame-chip pin" data-tip={copy.styleReference}>
    <Icon name="palette" size={12} />
    <span className="sr-only">{copy.styleReference}</span>
  </span>
);

export { FramePinMark };
