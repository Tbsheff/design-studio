import { useEffect } from "react";
import type { RefObject } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { hasOpenModal } from "./rail-modal-model.js";
import { getRailState, setRailToggled } from "./rail-store-model.js";

const useRailKeys = (
  find: RefObject<HTMLInputElement | null>,
  isMac: boolean
): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !matchesKey("project-rail", event, isMac) ||
        hasOpenModal()
      ) {
        return;
      }

      event.preventDefault();
      setRailToggled();

      if (getRailState() === "open") {
        globalThis.requestAnimationFrame(() => find.current?.focus());
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [find, isMac]);
};

export { useRailKeys };
