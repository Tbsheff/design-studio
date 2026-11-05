import { useCallback } from "react";
import type { ReactElement } from "react";

import { toLineText } from "./grid-model.js";
import type { LineKey } from "./grid-model.js";
import { GridTextField } from "./grid-text-field.js";

interface GridLineFieldProps {
  readonly disabled: boolean;
  readonly field: LineKey;
  readonly label: string;
  readonly tip: string;
  readonly value: number | null;
  readonly onCommit: (field: LineKey, raw: string) => void;
}

const GridLineField = ({
  disabled,
  field,
  label,
  tip,
  value,
  onCommit,
}: GridLineFieldProps): ReactElement => {
  const handleCommit = useCallback(
    (raw: string): void => {
      onCommit(field, raw);
    },
    [field, onCommit]
  );

  return (
    <GridTextField
      disabled={disabled}
      id={`grid-${field}`}
      label={label}
      tip={tip}
      value={toLineText(value)}
      onCommit={handleCommit}
    />
  );
};

export { GridLineField };

export type { GridLineFieldProps };
