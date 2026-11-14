import type { ReactElement } from "react";

import { textListCopy } from "./copy.js";
import { ListStyleChoice } from "./list-style-choice.js";
import { ListStyleInside } from "./list-style-inside.js";
import type { ListStyle, ListType } from "./list-style-model.js";

interface ListStyleFieldProps {
  readonly isDisabled: boolean;
  readonly onPickType: (type: ListType) => void;
  readonly onToggleInside: () => void;
  readonly listStyle: ListStyle;
}

const ListStyleField = ({
  isDisabled,
  onPickType,
  onToggleInside,
  listStyle,
}: ListStyleFieldProps): ReactElement => (
  <div className="ins-field ins-align-row ins-text-list">
    <span className="ins-scrub static">{textListCopy.label}</span>
    <ListStyleChoice
      isDisabled={isDisabled}
      onPick={onPickType}
      type={listStyle.type}
    />
    <ListStyleInside
      isDisabled={isDisabled}
      isOn={listStyle.position === "inside"}
      onToggle={onToggleInside}
    />
  </div>
);

export { ListStyleField };
