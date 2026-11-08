import { useEffect } from "react";
import type { RefObject } from "react";

import { hasOpenModal } from "./rail-modal-model.js";
import { isFloating, setRail } from "./rail-store-model.js";
import type { RailState } from "./rail-store-model.js";

const runFloatingClose = (): void => {
  if (isFloating()) {
    setRail("mini");
  }
};

const useFloatingDismiss = (
  state: RailState,
  rail: RefObject<HTMLElement | null>
): void => {
  useEffect(() => {
    if (state !== "open") {
      return;
    }

    const onPointer = (event: PointerEvent): void => {
      if (!rail.current?.contains(event.target as Node)) {
        runFloatingClose();
      }
    };

    const onKey = (event: KeyboardEvent): void => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !hasOpenModal()
      ) {
        runFloatingClose();
      }
    };

    globalThis.addEventListener("pointerdown", onPointer, true);
    globalThis.addEventListener("keydown", onKey);
    window.addEventListener("blur", runFloatingClose);

    return (): void => {
      globalThis.removeEventListener("pointerdown", onPointer, true);
      globalThis.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", runFloatingClose);
    };
  }, [state, rail]);
};

export { useFloatingDismiss };
