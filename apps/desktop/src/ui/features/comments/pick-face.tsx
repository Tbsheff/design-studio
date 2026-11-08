import type { ReactElement } from "react";

import { Icon } from "./deps.js";
import type { DesignComment } from "./deps.js";

const PickFace = ({
  comment,
  isOn,
}: {
  comment: DesignComment;
  isOn: boolean;
}): ReactElement => {
  if (isOn) {
    return <Icon name="check" size={12} />;
  }

  return <span>{comment.n}</span>;
};

export { PickFace };
