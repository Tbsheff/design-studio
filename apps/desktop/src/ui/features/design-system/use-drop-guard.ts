import { useEffect } from "react";

const useDropGuard = (): void => {
  useEffect(() => {
    const outside = (event: globalThis.DragEvent): void => {
      const { target } = event;

      if (target instanceof Element && target.closest("[data-drop-target]")) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
    };

    globalThis.addEventListener("dragover", outside);
    globalThis.addEventListener("drop", outside);

    return (): void => {
      globalThis.removeEventListener("dragover", outside);
      globalThis.removeEventListener("drop", outside);
    };
  }, []);
};

export { useDropGuard };
