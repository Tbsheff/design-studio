import type { ReactElement } from "react";

import { toFootText } from "./components-panel-model.js";

const ComponentsFoot = ({
  canInsert,
  count,
}: {
  canInsert: boolean;
  count: number;
}): ReactElement | null => {
  if (count === 0) {
    return null;
  }

  return <p className="cmp-foot">{toFootText(canInsert)}</p>;
};

export { ComponentsFoot };
