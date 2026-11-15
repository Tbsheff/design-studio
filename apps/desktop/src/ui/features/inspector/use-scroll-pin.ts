import { useCallback, useMemo } from "react";

import type { InspectorProps } from "./inspector-model.js";
import {
  toFixedPatch,
  toFixedSide,
  toLockedPin,
  toOffsetSide,
  toScrollPin,
  toScrollPinCurrent,
  toScrollPinPatch,
  toScrollPinValue,
  toSideValue,
} from "./scroll-pin-model.js";
import type { FixedSide, ScrollPin } from "./scroll-pin-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useDirectEdits } from "./use-direct-edits.js";
import { setEdit } from "./use-layout-keys.js";

interface ScrollPinState {
  readonly blocked: string | null;
  readonly choice: ScrollPin;
  readonly edit: DirectEdit;
  readonly handlePick: (value: string) => void;
  readonly handleSide: (value: string) => void;
  readonly locked: ScrollPin | null;
  readonly offset: FixedSide | null;
  readonly side: FixedSide;
}

const useScrollPin = (props: InspectorProps): ScrollPinState => {
  const edit = useDirectEdits({
    control: props.control,
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    port: props.port,
    projectId: props.projectId,
    rewrite: null,
    selections: props.selection,
  });

  const { position } = edit.values;
  const current = useMemo(() => toScrollPinCurrent(edit.values), [edit.values]);
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
      const next = toSideValue(value);

      if (next !== null && next !== side) {
        setEdit(edit, toFixedPatch(next, { ...current, bottom: "", top: "" }));
      }
    },
    [current, edit, side]
  );

  const { blocked } = edit;
  const locked = toLockedPin(position);
  const offset = toOffsetSide(choice, side);

  return {
    blocked,
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
