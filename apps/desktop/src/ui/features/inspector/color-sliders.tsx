import type { ReactElement } from "react";

import {
  HUE_MAX,
  PERCENT,
  toAlphaTrack,
  toColorText,
  toHueColor,
} from "./color-popup-model.js";
import { ColorSlider } from "./color-slider.js";
import { ColorTextFields } from "./color-text-fields.js";
import { copy } from "./copy.js";
import type { ColorControls } from "./use-color-controls.js";
import type { ColorPopupState } from "./use-color-popup.js";

import styles from "./color-popup.module.css";

const HUE_TRACK =
  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

const ColorSliders = ({
  popup,
  controls,
}: {
  readonly popup: ColorPopupState;
  readonly controls: ColorControls;
}): ReactElement => {
  const { hsva } = popup;

  return (
    <div className={styles.rows}>
      <ColorSlider
        label={copy.adjustHue}
        value={hsva.hue}
        max={HUE_MAX}
        track={HUE_TRACK}
        thumb={toHueColor(hsva.hue)}
        control={controls.hue}
      />
      <ColorSlider
        label={copy.colorAlpha}
        value={hsva.alpha * PERCENT}
        max={PERCENT}
        track={toAlphaTrack(hsva)}
        thumb={toColorText(hsva)}
        control={controls.alpha}
      />
      <ColorTextFields popup={popup} />
    </div>
  );
};

export { ColorSliders };
