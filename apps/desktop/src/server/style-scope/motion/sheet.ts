import { randomBytes } from "node:crypto";

import { entranceLines, keyframeLine, transitionLines } from "./css.js";
import type { MotionSpec } from "./deps.js";

const MARKER_BYTES = 4;

const toNewMarker = (): string =>
  `studio-mo-${randomBytes(MARKER_BYTES).toString("hex")}`;

const toCssModeLines = (spec: MotionSpec, marker: string): string[] => {
  if (spec.kind === "transition") {
    return transitionLines(marker, spec);
  }

  if (spec.kind === "entrance") {
    return [keyframeLine(spec.preset), ...entranceLines(marker, spec)];
  }

  return [];
};

export { toCssModeLines as cssModeLines, toNewMarker as newMarker };
