import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ImageFit } from "../../../shared/image.js";
import { FIT_LABEL, FIT_TIP, toFitClass } from "./image-model.js";

interface Props {
  readonly option: ImageFit;
  readonly isOn: boolean;
  readonly isDisabled: boolean;
  readonly onPick: (option: ImageFit) => void;
}

const ImageFitButton = ({
  option,
  isOn,
  isDisabled,
  onPick,
}: Props): ReactElement => {
  const handlePick = useCallback((): void => {
    onPick(option);
  }, [onPick, option]);

  return (
    <button
      type="button"
      className={toFitClass(isOn)}
      aria-pressed={isOn}
      disabled={isDisabled}
      data-tip={FIT_TIP[option]}
      onClick={handlePick}
    >
      {FIT_LABEL[option]}
    </button>
  );
};

export { ImageFitButton };
