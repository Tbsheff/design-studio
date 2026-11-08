import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const TweaksEmptyState = ({
  isRunning,
  onSuggest,
}: {
  readonly isRunning: boolean;
  readonly onSuggest: () => void;
}): ReactElement => (
  <div className="twk-empty">
    <span className="twk-empty-icon" aria-hidden="true">
      <Icon name="settings" size={18} />
    </span>
    <h3 className="twk-empty-title">{copy.noTweaksYet}</h3>
    <p className="twk-empty-text">{copy.tweaksAreLiveControlsFor2}</p>
    <button
      type="button"
      className="btn small primary"
      disabled={isRunning}
      onClick={onSuggest}
    >
      <Icon name="sparkle" size={13} />
      {copy.suggestTweaks}
    </button>
    {isRunning && <p className="twk-empty-note">{copy.waitForTheCurrentRun}</p>}
  </div>
);

export { TweaksEmptyState };
