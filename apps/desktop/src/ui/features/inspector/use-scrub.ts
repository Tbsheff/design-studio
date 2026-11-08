import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

import { formatNumber, parseNumber } from "./css-values.js";
import {
  SCRUB_PX_PER_STEP,
  toPlainLength,
  toClamped,
  toPatch,
  applyMixedShift,
  toStep,
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

const startScrub = (
  spec: NumberSpec,
  ui: TokenUi | null,
  positionX: number
): Scrub => {
  const unit = spec.unit ?? "px";

  const parsed = parseNumber(
    toPlainLength(spec.edit.values[spec.prop], ui)
  ) ?? {
    unit,
    value: 0,
  };

  return {
    isMixed: spec.edit.mixed.has(spec.prop),
    isMoved: false,
    unit: parsed.unit || unit,
    value: parsed.value,
    x: positionX,
  };
};

const applyScrubMove = (
  spec: NumberSpec,
  entry: Scrub,
  event: PointerEvent<HTMLElement>
): Scrub | null => {
  const steps = Math.trunc((event.clientX - entry.x) / SCRUB_PX_PER_STEP);

  if (steps === 0) {
    return null;
  }

  const moved: Scrub = {
    ...entry,
    isMoved: true,
    x: entry.x + steps * SCRUB_PX_PER_STEP,
  };

  document.body.classList.add("ins-scrubbing");

  if (moved.isMixed) {
    applyMixedShift(spec, steps * toStep(event, spec));

    return moved;
  }

  const amount = formatNumber(
    moved.value + steps * toStep(event, spec),
    moved.unit
  );

  const value = parseNumber(toClamped(amount, spec))?.value ?? moved.value;

  spec.edit.preview(toPatch(spec, formatNumber(value, moved.unit)));

  return { ...moved, value };
};

interface UseScrubResult {
  readonly onClick: (event: MouseEvent<HTMLElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
}

const useScrub = (spec: NumberSpec): UseScrubResult => {
  const scrub = useRef<Scrub | null>(null);
  const scrubbed = useRef(false);
  const ui = useTokenUi();

  const onPointerDown = (event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    scrub.current = startScrub(spec, ui, event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>): void => {
    const entry = scrub.current;

    if (!entry) {
      return;
    }

    const moved = applyScrubMove(spec, entry, event);

    if (moved) {
      scrub.current = moved;
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>): void => {
    const entryValue = scrub.current;

    if (!entryValue) {
      return;
    }

    scrub.current = null;
    document.body.classList.remove("ins-scrubbing");

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    scrubbed.current = entryValue.isMoved;

    if (entryValue.isMoved) {
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

  const onPointerCancel = onPointerUp;

  return {
    onClick,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
};

export { startScrub, useScrub };

export type { Scrub };
