import type { ReactElement } from "react";

import { AlignGrid } from "./align-grid.js";
import { SPACE_BETWEEN, isWrapping, toDirection } from "./auto-layout-model.js";
import { FlexToolbar } from "./flex-toolbar.js";
import { GapFields } from "./gap-fields.js";
import { GapModeField } from "./gap-mode-field.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface Props {
  readonly edit: DirectEdit;
}

const FlexControls = ({ edit }: Props): ReactElement => {
  const direction = toDirection(edit.values["flex-direction"]);
  const wraps = isWrapping(edit.values["flex-wrap"]);
  const isAuto = edit.values["justify-content"] === SPACE_BETWEEN;

  return (
    <div className="ins-flex">
      <AlignGrid edit={edit} isRow={direction === "row"} isGrid={false} />
      <div className="ins-flex-side">
        <FlexToolbar edit={edit} direction={direction} wraps={wraps} />
        <GapModeField edit={edit} />
        <GapFields edit={edit} isSplit={wraps} isAuto={isAuto} />
      </div>
    </div>
  );
};

export { FlexControls };
