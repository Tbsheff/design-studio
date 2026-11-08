import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

import { formatNumber, parseNumber } from "./css-values.js";
import {
  SCRUB_PX_PER_STEP,
  plainLength,
  clamp,
  patchFor,
  shiftMixed,
  stepOf,
} from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { useTokenUi } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

interface Scrub {
  readonly x: number;
  readonly value: number;
  readonly unit: string;
  readonly isMoved: boolean;
  readonly isMixed: boolean;
}

const scrubStart = (spec: NumberSpec, ui: TokenUi | null, x: number): Scrub => {
  const unit = spec.unit ?? "px";

  const parsed = parseNumber(plainLength(spec.edit.values[spec.prop], ui)) ?? {
    unit,
    value: 0,
  };

  return {
    isMixed: spec.edit.mixed.has(spec.prop),
    isMoved: false,
    unit: parsed.unit || unit,
    value: parsed.value,
    x,
  };
};

const useScrub = (spec: NumberSpec) => {
  const scrub = useRef<Scrub | null>(null);
  const scrubbed = useRef(false);
  const ui = useTokenUi();

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    scrub.current = scrubStart(spec, ui, event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const s = scrub.current;

    if (!s) {
      return;
    }

    const steps = Math.trunc((event.clientX - s.x) / SCRUB_PX_PER_STEP);

    if (steps === 0) {
      return;
    }

    const moved: Scrub = {
      ...s,
      isMoved: true,
      x: s.x + steps * SCRUB_PX_PER_STEP,
    };

    scrub.current = moved;
    document.body.classList.add("ins-scrubbing");

    if (moved.isMixed) {
      return shiftMixed(spec, steps * stepOf(event, spec));
    }

    const value =
      parseNumber(
        clamp(
          formatNumber(moved.value + steps * stepOf(event, spec), moved.unit),
          spec
        )
      )?.value ?? moved.value;

    scrub.current = { ...moved, value };
    spec.edit.preview(patchFor(spec, formatNumber(value, moved.unit)));
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>): void => {
    const s = scrub.current;

    if (!s) {
      return;
    }

    scrub.current = null;
    document.body.classList.remove("ins-scrubbing");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    scrubbed.current = s.isMoved;

    if (s.isMoved) {
      spec.edit.commit();
    }
  };

  const onClick = (event: MouseEvent<HTMLElement>): void => {
    if (!scrubbed.current) {
      return;
    }

    scrubbed.current = false;
    event.preventDefault();
  };

  return {
    onClick,
    onPointerCancel: onPointerUp,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
};

export { scrubStart, useScrub };

export type { Scrub };
