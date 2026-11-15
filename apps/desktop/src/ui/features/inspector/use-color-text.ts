import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import {
  fromAlphaText,
  fromHexText,
  toAlphaPercent,
  toHexText,
} from "./color-popup-model.js";
import type { ColorPopupState } from "./use-color-popup.js";

interface ColorTextField {
  readonly text: string;
  readonly handleBlur: () => void;
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

interface ColorText {
  readonly alpha: ColorTextField;
  readonly hex: ColorTextField;
}

const useTextField = (
  shown: string,
  apply: (text: string) => void
): ColorTextField => {
  const [draft, setDraft] = useState<string | null>(null);

  const handleBlur = useCallback((): void => {
    if (draft !== null) {
      apply(draft);
    }

    setDraft(null);
  }, [draft, apply]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setDraft(event.target.value),
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handleBlur();
      }
    },
    [handleBlur]
  );

  return { handleBlur, handleChange, handleKeyDown, text: draft ?? shown };
};

const useColorText = (popup: ColorPopupState): ColorText => {
  const { commitColor, hsva } = popup;

  const applyHex = useCallback(
    (text: string): void => {
      const next = fromHexText(text, hsva.alpha);

      if (next) {
        commitColor(next);
      }
    },
    [commitColor, hsva.alpha]
  );

  const applyAlpha = useCallback(
    (text: string): void => {
      const alpha = fromAlphaText(text);

      if (alpha !== null) {
        commitColor({ ...hsva, alpha });
      }
    },
    [commitColor, hsva]
  );

  return {
    alpha: useTextField(String(toAlphaPercent(hsva)), applyAlpha),
    hex: useTextField(toHexText(hsva).slice(1), applyHex),
  };
};

export { useColorText };

export type { ColorTextField };
