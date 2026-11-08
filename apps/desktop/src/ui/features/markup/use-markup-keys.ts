import { useEffect } from "react";

const useMarkupKeys = (onCancel: () => void): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [onCancel]);
};

export { useMarkupKeys };
