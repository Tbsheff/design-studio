import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const MENU_ICON_SIZE = 16;

const SnapItem = ({
  cssVar,
  onSnap,
}: {
  readonly cssVar: string;
  readonly onSnap: () => void;
}): ReactNode => (
  <button type="button" role="menuitem" className="tk-item" onClick={onSnap}>
    <Icon name="magnet" size={MENU_ICON_SIZE} />
    <span>
      {COPY.rawSnapTo}
      <code>{cssVar}</code>
    </span>
  </button>
);

export { SnapItem };
