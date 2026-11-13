import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";
import { ThemeSwitch } from "./theme-switch.js";
import type { ThemeControl } from "./theme-switch.js";
import type { ZoomProps } from "./top-bar-zoom-model.js";
import { ZoomPill } from "./top-bar-zoom.js";

const ZoomControl = ({
  control,
  theme,
}: {
  readonly control: ZoomProps;
  readonly theme: ThemeControl | null;
}): ReactElement => {
  const { onStep } = control;
  const zoomOut = useCallback((): void => onStep(-1), [onStep]);
  const zoomIn = useCallback((): void => onStep(1), [onStep]);

  return (
    <fieldset className="canvas-zoom" aria-label={copy.zoom}>
      {theme && <ThemeSwitch control={theme} place="zoom" />}
      <button
        type="button"
        className="canvas-zoom-step"
        aria-label={copy.zoomOut}
        data-tip={tipWithKey(copy.zoomOut, "zoom-out")}
        onClick={zoomOut}
      >
        <Icon name="minus" size={14} />
      </button>
      <ZoomPill control={control} />
      <button
        type="button"
        className="canvas-zoom-step"
        aria-label={copy.zoomIn}
        data-tip={tipWithKey(copy.zoomIn, "zoom-in")}
        onClick={zoomIn}
      >
        <Icon name="plus" size={14} />
      </button>
    </fieldset>
  );
};

export { ZoomControl };
