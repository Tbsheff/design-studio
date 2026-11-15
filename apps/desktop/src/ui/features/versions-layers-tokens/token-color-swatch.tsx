import { Suspense, useCallback, useMemo } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { AliasRow } from "./alias-row.js";
import { useColorPickerSlot } from "./use-color-picker-slot.js";

interface TokenColorSwatchProps {
  readonly fill: string;
  readonly hex: string | null;
  readonly isEmpty: boolean;
  readonly label: string;
  readonly path: string | null;
  readonly swatch: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
}

const NEUTRAL_SWATCH = "#ffffff";

const toHeader = (text: string): ReactNode => <AliasRow text={text} />;

const TokenColorSwatch = ({
  fill,
  hex,
  isEmpty,
  label,
  onChange,
  path,
  swatch,
  value,
}: TokenColorSwatchProps): ReactNode => {
  const picker = useColorPickerSlot({
    label,
    onChange,
    path,
    swatch,
    toHeader,
    value,
  });

  let emptyClass = "";

  if (isEmpty) {
    emptyClass = "empty";
  }

  const swatchStyle = useMemo(() => ({ ["--swatch" as string]: fill }), [fill]);

  const handleColorInput = useCallback(
    (event: FormEvent<HTMLInputElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange]
  );

  const handlePick = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange]
  );

  if (picker) {
    return <Suspense fallback={null}>{picker}</Suspense>;
  }

  return (
    <span className={`ins-swatch ${emptyClass}`} style={swatchStyle}>
      <input
        type="color"
        aria-label={`${label} picker`}
        value={hex ?? NEUTRAL_SWATCH}
        onInput={handleColorInput}
        onChange={handlePick}
      />
    </span>
  );
};

export { TokenColorSwatch };
