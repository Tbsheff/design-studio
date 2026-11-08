import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { ICON_SIZE, toLinkIcon, toLinkTip } from "./box-model-model.js";
import type { Box } from "./box-model-model.js";

interface Props {
  readonly box: Box;
  readonly isLinked: boolean;
  readonly onToggle: () => void;
}

const LinkToggle = ({ box, isLinked, onToggle }: Props): ReactElement => (
  <button
    type="button"
    className="icon-btn ins-link"
    aria-label={`Link ${box} sides`}
    aria-pressed={isLinked}
    data-tip={toLinkTip(box, isLinked)}
    onClick={onToggle}
  >
    <Icon name={toLinkIcon(isLinked)} size={ICON_SIZE} />
  </button>
);

export { LinkToggle };
