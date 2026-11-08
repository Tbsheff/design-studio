import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

const TWEAK_TRIGGER = '[aria-label="Tweak"]';

const useTweakDismiss = (
  root: RefObject<HTMLFormElement | null>,
  field: RefObject<HTMLInputElement | null>,
  onClose: () => void
): void => {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    field.current?.focus();

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Element;

      if (!root.current?.contains(target) && !target.closest?.(TWEAK_TRIGGER)) {
        close();
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [root, field]);
};

export { useTweakDismiss };
