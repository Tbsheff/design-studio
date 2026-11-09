import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ICON_SIZE = 14;

const AttachRow = ({
  onAttach,
}: {
  readonly onAttach: () => void;
}): ReactElement => (
  <button type="button" className="ide-row ide-attach" onClick={onAttach}>
    <span className="ide-row-lead" aria-hidden="true">
      <Icon name="plus" size={ICON_SIZE} />
    </span>
    <span className="ide-row-label">{copy.attachAppFolder}</span>
  </button>
);

export { AttachRow };
