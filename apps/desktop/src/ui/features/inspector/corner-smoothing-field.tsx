import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SMOOTHING_SHORT } from "./corner-smoothing-model.js";
import { PlainNumberField } from "./plain-number-field.js";
import { useCornerSmoothing } from "./use-corner-smoothing.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface CornerSmoothingFieldProps {
  readonly edit: DirectEdit;
}

const CornerSmoothingField = ({
  edit,
}: CornerSmoothingFieldProps): ReactElement | null => {
  const smoothing = useCornerSmoothing(edit);

  if (!smoothing.isShown) {
    return null;
  }

  return (
    <div className="ins-smoothing" data-tip={copy.smoothingTip}>
      <PlainNumberField
        id="ins-corner-smoothing"
        short={SMOOTHING_SHORT}
        spec={smoothing.spec}
      />
      <button
        type="button"
        className="ins-chip-toggle"
        aria-pressed={smoothing.isIos}
        onClick={smoothing.handleIos}
      >
        {copy.iosSmoothing}
      </button>
    </div>
  );
};

export { CornerSmoothingField };
