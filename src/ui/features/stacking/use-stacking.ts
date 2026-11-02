import { useCallback, useMemo, useState, useTransition } from "react";

import { insertError, useEditVariant } from "./deps.js";
import type { SelectionContext, StackingInfo } from "./deps.js";
import { writeStacking } from "./stacking-api.js";
import type { StackingIds } from "./stacking-api.js";
import { breakpointOf } from "./stacking-model.js";
import type { StackingEdit } from "./stacking-model.js";
import { useStackingInfo } from "./use-stacking-info.js";

interface Stacking {
  readonly apply: (edit: StackingEdit) => void;
  readonly breakpoint: string;
  readonly error: string | null;
  readonly info: StackingInfo | null;
  readonly isPending: boolean;
}

const useStacking = (ids: StackingIds, target: SelectionContext): Stacking => {
  const variant = useEditVariant();
  const breakpoint = breakpointOf(variant);
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const load = useStackingInfo(ids, target.source, breakpoint, round);

  const apply = useCallback(
    (edit: StackingEdit): void => {
      if (Object.keys(edit).length === 0) {
        return;
      }

      startTransition(async () => {
        try {
          await writeStacking(ids, target, breakpoint, edit);
          setSaveError(null);
        } catch (error) {
          setSaveError(insertError(error));
        }

        setRound((value) => value + 1);
      });
    },
    [breakpoint, ids, target]
  );

  const error = saveError ?? load.error;
  const { info } = load;

  return useMemo(
    () => ({ apply, breakpoint, error, info, isPending }),
    [apply, breakpoint, error, info, isPending]
  );
};

export { useStacking };

export type { Stacking };
