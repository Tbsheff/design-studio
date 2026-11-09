import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EyedropperSwatch } from "./eyedropper-swatch.js";
import type { EyedropperState } from "./use-eyedropper.js";

const EyedropperHexButton = ({
  dropper,
}: {
  readonly dropper: EyedropperState;
}): ReactElement => (
  <button type="button" className="eyedrop-hex" onClick={dropper.handleUseHex}>
    <EyedropperSwatch color={dropper.hex ?? "transparent"} />
    {copy.eyedropperUseHex}
    <code>{dropper.hex}</code>
  </button>
);

export { EyedropperHexButton };
