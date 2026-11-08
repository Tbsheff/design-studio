import { useEffect, useMemo } from "react";

import { uiStore } from "../../platform/storage.js";
import { isTypingTarget } from "../../platform/typing-target.js";

interface RulersControl {
  readonly on: boolean;
  readonly onToggle: () => void;
}

const toggleRulers = (): void => uiStore.set((st) => ({ rulers: !st.rulers }));

const hasModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const isRulersChord = (event: KeyboardEvent): boolean =>
  event.code === "KeyR" &&
  event.shiftKey &&
  !hasModifier(event) &&
  !event.repeat;

const isLayerOpen = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(".present-layer") !== null;

const useRulersKey = (): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!isRulersChord(event) || isTypingTarget(event.target)) {
        return;
      }

      if (isLayerOpen(event.target)) {
        return;
      }

      event.preventDefault();
      toggleRulers();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const useRulersControl = (isOn: boolean): RulersControl =>
  useMemo(() => ({ on: isOn, onToggle: toggleRulers }), [isOn]);

export { toggleRulers, useRulersControl, useRulersKey };

export type { RulersControl };
