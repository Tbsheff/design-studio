import { useCallback, useMemo } from "react";

import type { EffectKind } from "./deps.js";
import {
  toMoved,
  toNewEffect,
  toRemoved,
  toReplaced,
  toSized,
} from "./effect-model.js";
import type { ShadowSizePick } from "./effect-model.js";
import type { EffectItem } from "./effect-types.js";
import type { Effects } from "./use-effects.js";

interface EffectHandlers {
  readonly handleAdd: (kind: EffectKind) => void;
  readonly handleChange: (index: number, item: EffectItem) => void;
  readonly handleMove: (index: number, step: number) => void;
  readonly handleRemove: (index: number) => void;
}

interface SizePickRow {
  readonly index: number;
  readonly item: EffectItem;
  readonly onChange: (index: number, item: EffectItem) => void;
  readonly onRemove: (index: number) => void;
}

const useSizePick = ({
  index,
  item,
  onChange,
  onRemove,
}: SizePickRow): ((pick: ShadowSizePick) => void) =>
  useCallback(
    (pick: ShadowSizePick): void => {
      if (pick === "none") {
        onRemove(index);

        return;
      }

      if (pick !== "custom") {
        onChange(index, toSized(item, pick));
      }
    },
    [index, item, onChange, onRemove]
  );

interface RowMoves {
  readonly handleDown: () => void;
  readonly handleUp: () => void;
}

const useRowMoves = (
  index: number,
  onMove: (index: number, step: number) => void
): RowMoves => {
  const handleUp = useCallback((): void => {
    onMove(index, -1);
  }, [index, onMove]);

  const handleDown = useCallback((): void => {
    onMove(index, 1);
  }, [index, onMove]);

  return { handleDown, handleUp };
};

const useEffectHandlers = (effects: Effects): EffectHandlers => {
  const { apply, info } = effects;
  const list = info?.effects;

  const handleAdd = useCallback(
    (kind: EffectKind): void => {
      apply([...(list ?? []), toNewEffect(kind)]);
    },
    [apply, list]
  );

  const handleChange = useCallback(
    (index: number, item: EffectItem): void => {
      apply(toReplaced(list ?? [], index, item));
    },
    [apply, list]
  );

  const handleMove = useCallback(
    (index: number, step: number): void => {
      apply(toMoved(list ?? [], index, step));
    },
    [apply, list]
  );

  const handleRemove = useCallback(
    (index: number): void => {
      apply(toRemoved(list ?? [], index));
    },
    [apply, list]
  );

  return useMemo(
    () => ({ handleAdd, handleChange, handleMove, handleRemove }),
    [handleAdd, handleChange, handleMove, handleRemove]
  );
};

export { useEffectHandlers, useRowMoves, useSizePick };

export type { EffectHandlers };
