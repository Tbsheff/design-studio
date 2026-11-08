import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { Hint } from "./app-hint-types.js";

const HintIcon = ({ hint }: { hint: Hint }): ReactElement => {
  if (hint.busy) {
    return <span className="spinner" aria-hidden="true" />;
  }

  let name2: "alert" | "file" = "alert";

  if (hint.kind === "route") {
    name2 = "file";
  }

  return <Icon name={name2} size={14} />;
};

export { HintIcon };
