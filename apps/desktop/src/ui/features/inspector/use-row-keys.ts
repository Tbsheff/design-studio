import { useCallback } from "react";
import type { KeyboardEvent } from "react";

const useRowKeys = (
  onCommit: () => void,
  onRevert: () => void
): ((event: KeyboardEvent<HTMLInputElement>) => void) =>
  useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onCommit();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onRevert();
      }
    },
    [onCommit, onRevert]
  );

export { useRowKeys };
