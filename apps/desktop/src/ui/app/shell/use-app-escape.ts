import { useEffect } from "react";

import { useLatest } from "../../platform/use-latest.js";

const useEscape = (onClose: () => void): void => {
  const close = useLatest(onClose);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      event.stopImmediatePropagation();
      event.preventDefault();
      close.current();
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => globalThis.removeEventListener("keydown", onKey, true);
  }, [close]);
};

export { useEscape };
