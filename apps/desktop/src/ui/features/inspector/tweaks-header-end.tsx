import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TweaksSuggestButton } from "./tweaks-suggest-button.js";

const TweaksHeaderEnd = ({
  count,
  isRunning,
  hasControls,
  onDiscard,
  onSuggest,
}: {
  readonly count: number;
  readonly isRunning: boolean;
  readonly hasControls: boolean;
  readonly onDiscard: () => void;
  readonly onSuggest: () => void;
}): ReactElement => (
  <div className="twk-header-end">
    {count > 0 && (
      <button type="button" className="btn small ghost" onClick={onDiscard}>
        {copy.resetAll}
      </button>
    )}
    {hasControls && (
      <TweaksSuggestButton isRunning={isRunning} onSuggest={onSuggest} />
    )}
  </div>
);

export { TweaksHeaderEnd };
