import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { isEyeDropperSupported } from "../../platform/eye-dropper.js";
import { copy } from "./copy.js";
import { EyedropperPopup } from "./eyedropper-popup.js";
import { useEyedropper } from "./use-eyedropper.js";
import type { FieldProps } from "./use-same-field.js";

const ICON_SIZE = 12;

const EyedropperButton = ({
  edit,
  prop,
}: Pick<FieldProps, "edit" | "prop">): ReactElement | null => {
  const dropper = useEyedropper({ edit, prop });
  const { trigger, handlePick, isOpen } = dropper;

  if (!isEyeDropperSupported()) {
    return null;
  }

  return (
    <span className="eyedrop" ref={trigger}>
      <button
        type="button"
        className="eyedrop-button"
        aria-label={copy.eyedropperLabel}
        data-tip={copy.eyedropperTip}
        onClick={handlePick}
      >
        <Icon name="pipette" size={ICON_SIZE} />
      </button>
      {isOpen && <EyedropperPopup dropper={dropper} />}
    </span>
  );
};

export { EyedropperButton };
