import type { ReactElement } from "react";

import { DirectionToggle } from "./direction-toggle.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { WrapButton } from "./wrap-button.js";

interface Props {
  readonly edit: DirectEdit;
  readonly direction: string;
  readonly wraps: boolean;
}

const FlexToolbar = ({ edit, direction, wraps }: Props): ReactElement => (
  <div className="ins-flex-row">
    <DirectionToggle edit={edit} direction={direction} />
    <WrapButton edit={edit} wraps={wraps} />
  </div>
);

export { FlexToolbar };
