import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EyedropperOption } from "./eyedropper-option.js";
import type { EyedropperState } from "./use-eyedropper.js";

const EyedropperList = ({
  dropper,
}: {
  readonly dropper: EyedropperState;
}): ReactElement => (
  <ul className="eyedrop-list" aria-label={copy.eyedropperNearest}>
    {dropper.near.map((token, index) => (
      <EyedropperOption
        key={token.cssVar}
        index={index}
        isActive={index === dropper.activeIndex}
        token={token}
        onChoose={dropper.handleChoose}
        onHover={dropper.handleHover}
      />
    ))}
  </ul>
);

export { EyedropperList };
