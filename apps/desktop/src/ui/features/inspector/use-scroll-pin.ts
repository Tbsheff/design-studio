import { useCallback, useMemo } from "react";

import {
  toFixedPatch,
  toFixedSide,
  toFixedSideValue,
  toLockedPin,
  toOffsetSide,
  toScrollPin,
  toScrollPinCurrent,
  toScrollPinPatch,
  toScrollPinValue,
} from "./scroll-pin-model.js";
import type { FixedSide, ScrollPin } from "./scroll-pin-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { setEdit } from "./use-layout-keys.js";

interface ScrollPinState {
  readonly choice: ScrollPin | null;
  readonly edit: DirectEdit;
  readonly handlePick: (value: string) => void;
  readonly handleSide: (value: string) => void;
  readonly locked: ScrollPin | null;
  readonly offset: FixedSide | null;
  readonly side: FixedSide;
}

const NO_STYLES: Readonly<Record<string, string>> = {};

const useScrollPin = (
  edit: DirectEdit,
  styles: Readonly<Record<string, string>> | null
): ScrollPinState => {
  const { position } = edit.values;

  const current = useMemo(
    () => toScrollPinCurrent(edit.values, styles ?? NO_STYLES),
    [edit.values, styles]
  );

  const choice = toScrollPin(position);
  const side = toFixedSide(current);

  const handlePick = useCallback(
    (value: string): void => {
      const next = toScrollPinValue(value);

      if (next !== null && next !== choice) {
        setEdit(edit, toScrollPinPatch(next, current));
      }
    },
    [choice, current, edit]
  );

  const handleSide = useCallback(
    (value: string): void => {
      const next = toFixedSideValue(value);

      if (next !== null && next !== side) {
        setEdit(edit, toFixedPatch(next, { ...current, bottom: "", top: "" }));
      }
    },
    [current, edit, side]
  );

  const locked = toLockedPin(position);
  const offset = toOffsetSide(choice, side);

  return {
    choice,
    edit,
    handlePick,
    handleSide,
    locked,
    offset,
    side,
  };
};

export { useScrollPin };

export type { ScrollPinState };
