import { useEffect, useRef } from "react";

const useEscape = (onClose: () => void): void => {
  const close = useRef(onClose);
  close.current = onClose;
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
  }, []);
};

export { useEscape };
