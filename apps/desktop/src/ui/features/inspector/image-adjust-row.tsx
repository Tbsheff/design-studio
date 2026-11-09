import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ADJUST_FIELDS } from "./image-adjust-model.js";
import { AdjustSlider } from "./image-adjust-slider.js";
import type { ImageAdjust } from "./use-image-adjust.js";

interface RowProps {
  readonly adjust: ImageAdjust;
  readonly isDisabled: boolean;
}

const ImageAdjustRow = ({ adjust, isDisabled }: RowProps): ReactElement => (
  <fieldset className="img-adjust" aria-label={copy.adjust}>
    {ADJUST_FIELDS.map((field) => (
      <AdjustSlider
        key={field.key}
        adjust={adjust}
        field={field}
        isDisabled={isDisabled}
      />
    ))}
    <button
      type="button"
      className="btn img-adjust-reset"
      disabled={isDisabled || !adjust.isAdjusted}
      onClick={adjust.handleReset}
    >
      {copy.resetAdjust}
    </button>
  </fieldset>
);

export { ImageAdjustRow };
