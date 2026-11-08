import { createElement } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";

import { PERCENT_MAX } from "./compare-wipe-model.js";
import { COPY } from "./copy.js";
import { WipeKnob } from "./wipe-knob.js";

interface WipeHandleProps {
  readonly handleRef: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly pos: number;
  readonly valueText: string;
  readonly width: number;
}

const toWipeHandle = (props: WipeHandleProps): ReactNode => {
  const { onKeyDown, pos, valueText, width } = props;
  const ref = props.handleRef;
  const role = "slider";
  const tabIndex = 0;
  const style = { transform: `translateX(${(pos / PERCENT_MAX) * width}px)` };

  return createElement(
    "div",
    {
      "aria-label": COPY.labelComparePosition,
      "aria-orientation": "horizontal",
      "aria-valuemax": PERCENT_MAX,
      "aria-valuemin": 0,
      "aria-valuenow": Math.round(pos),
      "aria-valuetext": valueText,
      className: "compare-handle",
      "data-tip": COPY.tipDragOrUse,
      onKeyDown,
      ref,
      role,
      style,
      tabIndex,
    },
    createElement(WipeKnob)
  );
};

export { toWipeHandle };
