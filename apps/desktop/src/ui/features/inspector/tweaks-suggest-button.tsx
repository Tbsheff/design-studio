import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toSuggestTip } from "./tweaks-model.js";

const TweaksSuggestButton = ({
  isRunning,
  onSuggest,
}: {
  readonly isRunning: boolean;
  readonly onSuggest: () => void;
}): ReactElement => (
  <button
    type="button"
    className="btn small ghost"
    disabled={isRunning}
    data-tip={toSuggestTip(isRunning)}
    onClick={onSuggest}
  >
    <Icon name="sparkle" size={13} />
    {copy.suggest}
  </button>
);

export { TweaksSuggestButton };
