import { useEffect } from "react";

import { keyName } from "./interaction-model.js";

const useKeyCapture = (
  isOn: boolean,
  onKey: (key: string) => void,
  onCancel: () => void
): void => {
  useEffect(() => {
    if (!isOn) {
      return;
    }

    const listener = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === "Escape") {
        onCancel();

        return;
      }

      const name = keyName(event);

      if (name !== null) {
        onKey(name);
      }
    };

    globalThis.addEventListener("keydown", listener, true);

    return (): void => {
      globalThis.removeEventListener("keydown", listener, true);
    };
  }, [isOn, onCancel, onKey]);
};

export { useKeyCapture };
