import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const FOOT_ICON_SIZE = 12;

interface OpenRailFootProps {
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
}

const OpenRailFoot = ({
  onHome,
  onNewPrototype,
}: OpenRailFootProps): ReactElement => (
  <div className="prail-foot">
    <button type="button" className="btn small" onClick={onNewPrototype}>
      <Icon name="plus" size={FOOT_ICON_SIZE} />
      {copy.newPrototype}
    </button>
    <button type="button" className="btn small ghost" onClick={onHome}>
      <Icon name="arrowLeft" size={FOOT_ICON_SIZE} />
      {copy.allProjects}
    </button>
  </div>
);

export { OpenRailFoot };
