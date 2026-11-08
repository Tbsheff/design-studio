import type { ReactElement } from "react";

import { IMAGE_FITS } from "../../../shared/image.js";
import type { ImageFit } from "../../../shared/image.js";
import { copy } from "./copy.js";
import { ImageFitButton } from "./image-fit-button.js";

interface Props {
  readonly fit: ImageFit | null;
  readonly isDisabled: boolean;
  readonly onPick: (option: ImageFit) => void;
}

const ImageFitRow = ({ fit, isDisabled, onPick }: Props): ReactElement => (
  <fieldset className="segmented img-fit" aria-label={copy.fit}>
    {IMAGE_FITS.map((option) => (
      <ImageFitButton
        key={option}
        option={option}
        isOn={fit === option}
        isDisabled={isDisabled}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { ImageFitRow };
