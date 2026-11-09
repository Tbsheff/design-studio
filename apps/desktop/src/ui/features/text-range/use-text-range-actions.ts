import { useCallback } from "react";

import { toIsRemove } from "./text-range-model.js";
import type { TextRangeReading } from "./text-range-model.js";
import type {
  TextRangeApplyInput,
  TextRangeStyle,
} from "./use-text-range-apply.js";

interface TextRangeActionsSetup {
  readonly apply: (input: TextRangeApplyInput) => void;
  readonly clear: () => void;
  readonly setHeld: (reading: TextRangeReading | null) => void;
  readonly setIsLinkOpen: (isOpen: boolean) => void;
  readonly shown: TextRangeReading | null;
}

interface TextRangeActions {
  readonly handleBold: () => void;
  readonly handleColor: (className: string) => void;
  readonly handleDismiss: () => void;
  readonly handleItalic: () => void;
  readonly handleLink: () => void;
  readonly handleLinkSubmit: (href: string) => void;
}

const useTextRangeActions = (
  setup: TextRangeActionsSetup
): TextRangeActions => {
  const { apply, clear, setHeld, setIsLinkOpen, shown } = setup;

  const run = useCallback(
    (style: TextRangeStyle, value: string | null): void => {
      if (shown === null) {
        return;
      }

      setHeld(shown);
      setIsLinkOpen(false);
      apply({
        isRemove: style !== "class" && toIsRemove(style, shown.tag),
        reading: shown,
        style,
        value,
      });
    },
    [apply, setHeld, setIsLinkOpen, shown]
  );

  const handleBold = useCallback((): void => run("bold", null), [run]);
  const handleItalic = useCallback((): void => run("italic", null), [run]);

  const handleLink = useCallback((): void => {
    if (shown && toIsRemove("link", shown.tag)) {
      run("link", null);

      return;
    }

    setHeld(shown);
    setIsLinkOpen(true);
  }, [run, setHeld, setIsLinkOpen, shown]);

  const handleLinkSubmit = useCallback(
    (href: string): void => run("link", href),
    [run]
  );

  const handleColor = useCallback(
    (className: string): void => run("class", className),
    [run]
  );

  const handleDismiss = useCallback((): void => {
    setHeld(null);
    setIsLinkOpen(false);
    clear();
  }, [clear, setHeld, setIsLinkOpen]);

  return {
    handleBold,
    handleColor,
    handleDismiss,
    handleItalic,
    handleLink,
    handleLinkSubmit,
  };
};

export { useTextRangeActions };

export type { TextRangeActions };
