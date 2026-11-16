import { createElement } from "react";
import type { ReactElement } from "react";

import type { ColorPickerSlotProps } from "../../domain/color-picker-slot.js";
import { ColorPickerPopup } from "../../features/inspector/index.js";

const toColorPicker = (props: ColorPickerSlotProps): ReactElement =>
  createElement(ColorPickerPopup, props);

export { toColorPicker };
