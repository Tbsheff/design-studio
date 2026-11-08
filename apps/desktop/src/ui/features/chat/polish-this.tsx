import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { levelHint } from "./level-model.js";

const SPARKLE_ICON_SIZE = 14;

const toPolishTip = (isDisabled: boolean): string => {
  if (isDisabled) {
    return copy.polishWait;
  }

  return levelHint("polish");
};

const PolishThis = ({
  disabled,
  onPolish,
}: {
  disabled: boolean;
  onPolish: () => void;
}): ReactElement => (
  <div className="polish-this flex items-center gap-2 text-xs text-muted-foreground">
    <button
      type="button"
      className="btn small has-icon"
      data-testid="polish-this"
      disabled={disabled}
      data-tip-side="top"
      data-tip-align="start"
      data-tip={toPolishTip(disabled)}
      onClick={onPolish}
    >
      <Icon name="sparkle" size={SPARKLE_ICON_SIZE} />
      {copy.polishThis}
    </button>
    <span>{copy.runEveryCheckAnd}</span>
  </div>
);

export { PolishThis };
