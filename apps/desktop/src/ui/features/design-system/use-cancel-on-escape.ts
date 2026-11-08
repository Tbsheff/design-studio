import { useEffect } from "react";

const useCancelOnEscape = (isActive: boolean, cancel: () => void): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        cancel();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [isActive, cancel]);
};

export { useCancelOnEscape };
