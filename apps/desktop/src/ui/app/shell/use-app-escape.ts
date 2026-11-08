import { useEffect, useRef } from "react";

function useEscape(onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      event.stopImmediatePropagation();
      event.preventDefault();
      close.current();
    };

    globalThis.addEventListener("keydown", onKey, true);

    return () => globalThis.removeEventListener("keydown", onKey, true);
  }, []);
}

export { useEscape };
