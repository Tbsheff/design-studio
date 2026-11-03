import { useRef, type MouseEvent, type PointerEvent } from "react";

import { formatNumber, parseNumber } from "../../cssValues.js";
import { useTokenUi, type TokenUi } from "../../useTokenSnap.js";
import {
  SCRUB_PX_PER_STEP,
  plainLength,
  clamp,
  patchFor,
  shiftMixed,
  stepOf,
  type NumberSpec,
} from "./number-field-model.js";

interface Scrub {
  x: number;
  value: number;
  unit: string;
  moved: boolean;
  mixed: boolean;
}

const scrubStart = (spec: NumberSpec, ui: TokenUi | null, x: number): Scrub => {
  const unit = spec.unit ?? "px";
  const parsed = parseNumber(plainLength(spec.edit.values[spec.prop], ui)) ?? {
    value: 0,
    unit,
  };
  return {
    x,
    value: parsed.value,
    unit: parsed.unit || unit,
    moved: false,
    mixed: spec.edit.mixed.has(spec.prop),
  };
};

const useScrub = (spec: NumberSpec) => {
  const scrub = useRef<Scrub | null>(null);
  const scrubbed = useRef(false);
  const ui = useTokenUi();
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    scrub.current = scrubStart(spec, ui, event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s) return;
    const steps = Math.trunc((event.clientX - s.x) / SCRUB_PX_PER_STEP);
    if (steps === 0) return;
    s.x += steps * SCRUB_PX_PER_STEP;
    s.moved = true;
    document.body.classList.add("ins-scrubbing");
    if (s.mixed) return shiftMixed(spec, steps * stepOf(event, spec));
    s.value =
      parseNumber(
        clamp(formatNumber(s.value + steps * stepOf(event, spec), s.unit), spec)
      )?.value ?? s.value;
    spec.edit.preview(patchFor(spec, formatNumber(s.value, s.unit)));
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s) return;
    scrub.current = null;
    document.body.classList.remove("ins-scrubbing");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    scrubbed.current = s.moved;
    if (s.moved) spec.edit.commit();
  };
  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (!scrubbed.current) return;
    scrubbed.current = false;
    event.preventDefault();
  };
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClick,
  };
};

export { scrubStart, useScrub };

export type { Scrub };
