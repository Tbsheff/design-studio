import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toModKey } from "./clarify-model.js";
import { copy } from "./copy.js";

const BUILD_ICON_SIZE = 14;

const ClarifyFoot = ({
  busy,
  onSkip,
}: {
  busy: boolean;
  onSkip: () => void;
}): ReactElement => (
  <div className="clarify-foot">
    <button
      type="button"
      className="btn ghost small"
      onClick={onSkip}
      disabled={busy}
    >
      {copy.skipQuestions}
    </button>
    <button
      type="submit"
      className="btn primary small has-icon"
      disabled={busy}
      data-tip={`Build  ${toModKey()}↩`}
      data-tip-side="top"
      aria-keyshortcuts="Meta+Enter Control+Enter"
    >
      {busy && <span className="spinner" />}
      {!busy && <Icon name="arrowUp" size={BUILD_ICON_SIZE} />}
      {busy && "Creating…"}
      {!busy && "Build with answers"}
    </button>
  </div>
);

export { ClarifyFoot };
