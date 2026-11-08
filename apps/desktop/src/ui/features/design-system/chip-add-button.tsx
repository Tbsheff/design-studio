import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const ICON_SIZE = 14;

const ChipAddButton = ({ onAdd }: { onAdd: () => void }): ReactElement => (
  <button
    type="button"
    className="btn ghost small has-icon ds-add"
    onClick={onAdd}
  >
    <Icon name="palette" size={ICON_SIZE} />
    {COPY.textAddDesignSystem}
  </button>
);

export { ChipAddButton };
