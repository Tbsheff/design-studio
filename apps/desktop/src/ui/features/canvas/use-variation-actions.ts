import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";
import type { FrameVariation } from "./variation-model.js";

interface VariationActions {
  readonly onKeep: () => void;
  readonly onMix: (toDirectionId: string) => void;
  readonly isKeeping: boolean;
  readonly isMixing: boolean;
  readonly notice: string | null;
}

const useVariationActions = (
  variation: FrameVariation,
  element: SelectionContext | null,
  onMixed: () => void
): VariationActions => {
  const [isMixing, startMix] = useTransition();
  const [isKeeping, startKeep] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const { keepBlocked } = variation;
  const runKeep = variation.onKeep;
  const runMix = variation.onMix;

  const onKeep = useCallback((): void => {
    if (keepBlocked || isKeeping) {
      return;
    }

    setNotice(null);

    startKeep(async () => {
      try {
        await runKeep();
      } catch (error) {
        setNotice(`Could not keep it. ${errorText(error)}`);
      }
    });
  }, [keepBlocked, isKeeping, runKeep]);

  const onMix = useCallback(
    (toDirectionId: string): void => {
      if (!element) {
        return;
      }

      setNotice(null);

      startMix(async () => {
        try {
          await runMix(toDirectionId, element);
          onMixed();
        } catch (error) {
          setNotice(
            `Could not use the element. ${errorText(error)} Pick it again, then try again.`
          );
        }
      });
    },
    [element, runMix, onMixed]
  );

  return { isKeeping, isMixing, notice, onKeep, onMix };
};

export { useVariationActions };
