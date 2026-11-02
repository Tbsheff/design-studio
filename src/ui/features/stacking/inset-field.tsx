import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { StackingSide } from "./deps.js";
import { StackingTextField } from "./stacking-text-field.js";

interface InsetFieldProps {
  readonly disabled: boolean;
  readonly side: StackingSide;
  readonly value: string;
  readonly onCommit: (side: StackingSide, raw: string) => void;
}

const InsetField = ({
  disabled,
  side,
  value,
  onCommit,
}: InsetFieldProps): ReactElement => {
  const handleCommit = useCallback(
    (raw: string): void => {
      onCommit(side, raw);
    },
    [onCommit, side]
  );

  return (
    <StackingTextField
      disabled={disabled}
      id={`stacking-inset-${side}`}
      label={copy.side[side]}
      list=""
      tip={copy.sideTip}
      value={value}
      onCommit={handleCommit}
    />
  );
};

export { InsetField };
