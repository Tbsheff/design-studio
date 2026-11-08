import { useEffect } from "react";
import type { RefObject } from "react";

const useAutoFocus = (
  isEnabled: boolean,
  area: RefObject<HTMLTextAreaElement | null>
): void => {
  useEffect(() => {
    if (isEnabled) {
      area.current?.focus({ preventScroll: true });
    }
  }, [isEnabled, area]);
};

export { useAutoFocus };
