import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const NewMockRow = ({ onOpen }: { onOpen: () => void }): ReactElement => (
  <div className="ui-menu-section">
    <button
      type="button"
      role="menuitem"
      className="ui-menu-item"
      tabIndex={-1}
      onClick={onOpen}
    >
      <Icon name="plus" size={14} />
      <span>{copy.newMockData}</span>
    </button>
  </div>
);

export { NewMockRow };
