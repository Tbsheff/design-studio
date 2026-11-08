import { useEffect } from "react";
import type { RefObject } from "react";

import { useLatest } from "../../platform/use-latest.js";

const useDismissOutside = (
  input: () => HTMLElement | null,
  menu: RefObject<HTMLDivElement | null>,
  onClose: () => void
): void => {
  const closeRef = useLatest(onClose);
  const inputRef = useLatest(input);

  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (
        !inputRef.current()?.contains(target) &&
        !menu.current?.contains(target)
      ) {
        closeRef.current();
      }
    };

    document.addEventListener("mousedown", onDown);

    return (): void => document.removeEventListener("mousedown", onDown);
  }, [menu, closeRef, inputRef]);
};

export { useDismissOutside };
