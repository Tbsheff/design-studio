import { useCallback } from "react";
import type { ReactElement } from "react";

import type { BooleanOpName } from "../../../shared/vector.js";
import { BooleanGlyph } from "./vector-boolean-glyph.js";
import { BOOLEAN_LABEL, BOOLEAN_TIP } from "./vector-model.js";

const BooleanButton = ({
  op,
  isDisabled,
  onRun,
}: {
  readonly op: BooleanOpName;
  readonly isDisabled: boolean;
  readonly onRun: (op: BooleanOpName) => void;
}): ReactElement => {
  const applyOp = useCallback(() => onRun(op), [op, onRun]);

  return (
    <button
      type="button"
      aria-label={BOOLEAN_LABEL[op]}
      data-tip={BOOLEAN_TIP[op]}
      disabled={isDisabled}
      onClick={applyOp}
    >
      <BooleanGlyph op={op} />
    </button>
  );
};

export { BooleanButton };
