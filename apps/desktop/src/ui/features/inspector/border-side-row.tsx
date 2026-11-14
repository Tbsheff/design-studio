import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";

import { BORDER_SIDE_OPTIONS } from "./border-side-model.js";
import type { BorderSide } from "./border-side-model.js";
import { borderSideCopy } from "./copy.js";

interface BorderSideRowProps {
  readonly isDisabled: boolean;
  readonly side: BorderSide;
  readonly onSidePick: (next: string) => void;
}

const SIDE_SELECT_ID = "ins-border-sides";

const BorderSideRow = ({
  isDisabled,
  side,
  onSidePick,
}: BorderSideRowProps): ReactElement => (
  <div className="ins-field select">
    <UiSelect
      id={SIDE_SELECT_ID}
      aria-label={borderSideCopy.sidesLabel}
      value={side}
      options={BORDER_SIDE_OPTIONS}
      disabled={isDisabled}
      onChange={onSidePick}
    />
  </div>
);

export { BorderSideRow };
