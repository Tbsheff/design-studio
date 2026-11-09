import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { AttachRow } from "./attach-row.js";
import { copy } from "./copy.js";

const ICON_SIZE = 14;

const SidebarFoot = ({
  onAttach,
  onTrash,
}: {
  readonly onAttach: () => void;
  readonly onTrash: () => void;
}): ReactElement => (
  <div className="ide-side-foot">
    <AttachRow onAttach={onAttach} />
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.openTrash}
      data-tip={copy.openTrash}
      onClick={onTrash}
    >
      <Icon name="trash" size={ICON_SIZE} />
    </button>
  </div>
);

export { SidebarFoot };
