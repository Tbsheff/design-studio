import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly count: number;
  readonly onCancel: () => void;
  readonly onStart: () => void;
}

const ElementVariantsFoot = ({
  count,
  onCancel,
  onStart,
}: Props): ReactElement => (
  <footer className="variation-card-foot">
    <div className="spacer" />
    <div className="variation-card-actions">
      <button type="button" className="btn small" onClick={onCancel}>
        {copy.cancel}
      </button>
      <button
        type="button"
        className="btn small primary"
        onClick={onStart}
        data-testid="element-variants-start"
      >
        {copy.start}
        {count} {copy.variants2}
      </button>
    </div>
  </footer>
);

export { ElementVariantsFoot };
