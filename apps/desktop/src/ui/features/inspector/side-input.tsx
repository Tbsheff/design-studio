import type { DirectStyleProperty } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactElement } from "react";

import {
  SIDE_LABEL,
  toAutoTip,
  toBoxName,
  toSideDisplay,
  toSideSpec,
  toSideTargets,
} from "./box-model-model.js";
import type { Box, DeclaredMargins } from "./box-model-model.js";
import type { Side } from "./css-value-model.js";
import { TokenControl } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import { NumberInput } from "./number-input.js";

interface Props {
  readonly box: Box;
  readonly side: Side;
  readonly edit: DirectEdit;
  readonly isLinked: boolean;
  readonly declared: DeclaredMargins;
}

const SideInput = ({
  box,
  side,
  edit,
  isLinked,
  declared,
}: Props): ReactElement => {
  const prop = `${box}-${side}` as DirectStyleProperty;
  const label = `${toBoxName(box)} ${SIDE_LABEL[side]}`;
  const display = toSideDisplay(box, declared, side, edit);

  const targets = useMemo(
    () => toSideTargets(box, prop, isLinked),
    [box, isLinked, prop]
  );

  const spec = useMemo(
    () => toSideSpec({ box, display, edit, label, prop, targets }),
    [box, display, edit, label, prop, targets]
  );

  return (
    <span
      className={`side-cell ${side}`}
      data-tip={toAutoTip(display, edit.values[prop])}
    >
      <NumberInput spec={spec} />
      <TokenControl
        prop={prop}
        label={label}
        edit={edit}
        targets={targets}
        variant="mini"
      />
    </span>
  );
};

export { SideInput };
