import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { copy } from "./copy.js";
import { EyedropperHexButton } from "./eyedropper-hex-button.js";
import { EyedropperList } from "./eyedropper-list.js";
import type { EyedropperState } from "./use-eyedropper.js";

const toPortalHost = (): HTMLElement => document.body;

const EyedropperPopup = ({
  dropper,
}: {
  readonly dropper: EyedropperState;
}): ReactNode => {
  const { panel } = dropper;

  return (
    <>
      {createPortal(
        <dialog
          open
          className="tk-pop eyedrop-pop"
          ref={panel}
          style={dropper.popStyle}
          aria-label={copy.eyedropperNearest}
          onKeyDown={dropper.handleKeyDown}
        >
          <EyedropperList dropper={dropper} />
          <EyedropperHexButton dropper={dropper} />
        </dialog>,
        toPortalHost()
      )}
    </>
  );
};

export { EyedropperPopup };
