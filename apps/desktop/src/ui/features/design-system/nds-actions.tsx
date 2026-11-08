import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";

const NdsActions = ({
  isBusy,
  isReady,
  onCancel,
}: {
  isBusy: boolean;
  isReady: boolean;
  onCancel: () => void;
}): ReactElement => (
  <div className="nds-side-actions">
    <button
      type="submit"
      className="btn send has-icon nds-create"
      disabled={!isReady}
    >
      {isBusy && <span className="spinner" />}
      {toChoice(isBusy, COPY.textOpeningDraft, COPY.labelCreate)}
    </button>
    <button
      type="button"
      className="btn ghost"
      onClick={onCancel}
      disabled={isBusy}
    >
      {COPY.textCancel}
    </button>
  </div>
);

export { NdsActions };
