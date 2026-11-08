import type { ReactElement } from "react";

import { AlignGrid } from "./align-grid.js";
import { GapFields } from "./gap-fields.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
}

const GridControls = ({ edit }: Props): ReactElement => (
  <div className="ins-flex">
    <AlignGrid edit={edit} isRow isGrid />
    <div className="ins-flex-side">
      <GapFields edit={edit} isSplit isAuto={false} />
    </div>
  </div>
);

export { GridControls };
