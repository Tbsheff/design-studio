import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactElement } from "react";

import { ColorPickerSlot } from "../../domain/color-picker-slot.js";
import type { ColorPickerSlotProps } from "../../domain/color-picker-slot.js";

interface ColorPickerInput {
  readonly label: string;
  readonly swatch: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
}

const TokenCommitSlot = createContext<(() => void) | null>(null);

const useColorPickerSlot = (input: ColorPickerInput): ReactElement | null => {
  const render = useContext(ColorPickerSlot);
  const commitDraft = useContext(TokenCommitSlot);
  const { onChange } = input;

  const handleCommit = useCallback(
    (next: string): void => {
      onChange(next);
      commitDraft?.();
    },
    [onChange, commitDraft]
  );

  const props = useMemo(
    (): ColorPickerSlotProps => ({
      label: input.label,
      onCommit: handleCommit,
      onPreview: onChange,
      onRevert: onChange,
      swatch: input.swatch,
      value: input.value,
    }),
    [input.label, handleCommit, onChange, input.swatch, input.value]
  );

  if (!render) {
    return null;
  }

  return render(props);
};

export { TokenCommitSlot, useColorPickerSlot };
