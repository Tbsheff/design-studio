import type { ReactElement } from "react";

import { AlignField } from "./align-field.js";
import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";

const TextAlignRow = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => (
  <div className="wide">
    <div className="ins-field ins-align-row">
      <span className="ins-scrub static">{copy.align}</span>
      <AlignField edit={edit} />
    </div>
  </div>
);

export { TextAlignRow };
