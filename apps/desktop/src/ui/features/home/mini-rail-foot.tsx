import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ICON_SIZE = 14;

interface MiniRailFootProps {
  readonly onNewPrototype: () => void;
}

const MiniRailFoot = ({ onNewPrototype }: MiniRailFootProps): ReactElement => (
  <div className="prail-foot">
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.newPrototype}
      data-tip={copy.newPrototype}
      data-tip-side="top"
      data-tip-align="start"
      onClick={onNewPrototype}
    >
      <Icon name="plus" size={ICON_SIZE} />
    </button>
  </div>
);

export { MiniRailFoot };
