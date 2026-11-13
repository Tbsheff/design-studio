import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";

import { BORDER_SIDE_OPTIONS } from "./border-side-model.js";
import type { BorderSide } from "./border-side-model.js";
import { borderSideCopy } from "./copy.js";

interface BorderSideRowProps {
  readonly side: BorderSide;
  readonly onSidePick: (next: string) => void;
}

const SIDE_SELECT_ID = "ins-border-sides";

const BorderSideRow = ({
  side,
  onSidePick,
}: BorderSideRowProps): ReactElement => (
  <div className="ins-field select">
    <label htmlFor={SIDE_SELECT_ID} className="ins-scrub static">
      {borderSideCopy.sides}
    </label>
    <UiSelect
      id={SIDE_SELECT_ID}
      aria-label={borderSideCopy.sidesLabel}
      value={side}
      options={BORDER_SIDE_OPTIONS}
      onChange={onSidePick}
    />
  </div>
);

export { BorderSideRow };
