import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LinkState } from "./run-comments-model.js";

const CommentNumber = ({
  number,
  state,
}: {
  number: number;
  state: LinkState;
}): ReactElement => (
  <span className="num">
    {(state === "resolved" || state === "done") && (
      <Icon name="check" size={12} />
    )}
    {copy.text9}
    {number}
  </span>
);

export { CommentNumber };
