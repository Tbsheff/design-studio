import { parse, rgb } from "culori";

import type { Layer } from "../../page-probe/index.js";
import type { RawAttentionElement } from "./attention-probe.js";
import type {
  AttentionBox,
  AttentionElement,
  AttentionRgb,
} from "./engine/index.js";

const CHANNEL_MAX = 255;

const MIN_ALPHA = 0.5;

const toColor = (value: string | null): AttentionRgb | null => {
  if (value === null) {
    return null;
  }

  const parsed = parse(value);

  if (!parsed) {
    return null;
  }

  const color = rgb(parsed);

  if ((color.alpha ?? 1) < MIN_ALPHA) {
    return null;
  }

  return {
    blue: Math.round(color.b * CHANNEL_MAX),
    green: Math.round(color.g * CHANNEL_MAX),
    red: Math.round(color.r * CHANNEL_MAX),
  };
};

const toScaledBox = (
  box: RawAttentionElement["box"],
  scale: number
): AttentionBox => ({
  height: box.height * scale,
  width: box.width * scale,
  x: box.x * scale,
  y: box.y * scale,
});

const toAttentionElement = (
  raw: RawAttentionElement,
  layer: Layer | null,
  scale: number
): AttentionElement => ({
  backdrop: toColor(raw.backdrop),
  background: toColor(raw.background),
  box: toScaledBox(raw.box, scale),
  color: toColor(raw.color),
  fontSize: raw.fontSize,
  fontWeight: raw.fontWeight,
  isInteractive: raw.isInteractive,
  isPrimaryCandidate: raw.isPrimaryCandidate,
  label: raw.label,
  layerId: layer?.ref ?? null,
  role: raw.role,
  selector: raw.path,
  textLength: raw.textLength,
});

export { toAttentionElement, toScaledBox };
