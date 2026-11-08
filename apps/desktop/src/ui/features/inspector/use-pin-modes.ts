import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import type { PinAxis, PinMode } from "./constraints-model.js";
import { toPinMode } from "./constraints-model.js";
import { toFreshModes, toPickedModes } from "./position-model.js";
import type { PinPicked } from "./position-model.js";

interface PinModesApi {
  readonly modes: Record<PinAxis, PinMode>;
  readonly pick: (next: Partial<Record<PinAxis, PinMode>>) => void;
}

const SIDES = ["left", "right", "top", "bottom"];

const usePinModes = (selection: SelectionContext): PinModesApi => {
  const authored = SIDES.map(
    (side) => selection.styles[`authored-${side}`] ?? ""
  ).join("|");

  const key = `${selection.selector}|${authored}`;
  const [picked, setPicked] = useState<PinPicked>({ key, modes: {} });
  const fresh = toFreshModes(picked, key);
  const { selector } = selection;

  const modes = {
    x: fresh.x ?? toPinMode("x", selection.styles),
    y: fresh.y ?? toPinMode("y", selection.styles),
  };

  const pick = useCallback(
    (next: Partial<Record<PinAxis, PinMode>>) =>
      setPicked((prev) => toPickedModes(prev, selector, key, next)),
    [key, selector]
  );

  return { modes, pick };
};

export { usePinModes };

export type { PinModesApi };
