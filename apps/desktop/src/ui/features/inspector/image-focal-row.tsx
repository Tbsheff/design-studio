import type { ReactElement } from "react";

import { focalOf, focalText } from "../../../shared/image.js";
import { FocalPad } from "./focal-pad.js";

interface Props {
  readonly focal: string;
  readonly isDisabled: boolean;
  readonly onPick: (next: string) => void;
}

const ImageFocalRow = ({ focal, isDisabled, onPick }: Props): ReactElement => {
  const point = focalOf(focal);

  return (
    <div className="img-focal-row">
      <FocalPad value={focal} isDisabled={isDisabled} onPick={onPick} />
      <span className="img-focal-text">{focalText(point.x, point.y)}</span>
    </div>
  );
};

export { ImageFocalRow };
