import { useEffect } from "react";
import type { RefObject } from "react";

import { useLatest } from "../../platform/use-latest.js";

const useBackdropDismiss = (
  ref: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void
): void => {
  const dismiss = useLatest(onDismiss);

  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    const onDown = (event: MouseEvent): void => {
      if (event.target !== el) {
        return;
      }

      const rect = el.getBoundingClientRect();

      const isInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isInside) {
        dismiss.current();
      }
    };

    el.addEventListener("mousedown", onDown);

    return (): void => el.removeEventListener("mousedown", onDown);
  }, [dismiss, ref]);
};

export { useBackdropDismiss };
