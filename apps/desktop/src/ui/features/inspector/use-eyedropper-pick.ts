import { startTransition, useCallback } from "react";

import { pickScreenColor } from "../../platform/eye-dropper.js";
import { toNearestTokens } from "./eyedropper-model.js";
import type { TokenUi } from "./use-token-snap.js";

interface PickInput {
  readonly open: (view: "near") => void;
  readonly resetIndex: () => void;
  readonly setHex: (hex: string) => void;
  readonly ui: TokenUi | null;
  readonly write: (value: string) => void;
}

const useEyedropperPick = ({
  open,
  resetIndex,
  setHex,
  ui,
  write,
}: PickInput): (() => void) =>
  useCallback((): void => {
    startTransition(async () => {
      const picked = await pickScreenColor();

      if (!picked) {
        return;
      }

      const found = ui && toNearestTokens(picked, ui.entries, ui.mode);

      if (!found || found.length === 0) {
        write(picked);

        return;
      }

      setHex(picked);
      resetIndex();
      open("near");
    });
  }, [ui, write, open, resetIndex, setHex]);

export { useEyedropperPick };
