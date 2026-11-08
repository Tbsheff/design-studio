import { useMemo } from "react";
import type { ReactElement } from "react";

import { toCornerPart, toJoinedCorners } from "./corners-model.js";
import type { Side } from "./css-values.js";
import { PlainNumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface CornerFieldProps {
  readonly corners: Record<Side, string>;
  readonly source: DirectEdit;
  readonly label: string;
  readonly short: string;
  readonly side: Side;
}

const BORDER_RADIUS = "border-radius" as const;

const CornerField = ({
  corners,
  label,
  short,
  side,
  source,
}: CornerFieldProps): ReactElement => {
  const spec = useMemo(() => {
    const edit = proxyEdit(
      source,
      BORDER_RADIUS,
      corners[side],
      (value) => ({
        [BORDER_RADIUS]: toJoinedCorners({ ...corners, [side]: value }),
      }),
      [BORDER_RADIUS],
      { isMixed: null, part: toCornerPart(side) }
    );

    return { edit, label, min: 0, prop: BORDER_RADIUS };
  }, [source, corners, side, label]);

  return (
    <PlainNumberField id={`ins-radius-${side}`} short={short} spec={spec} />
  );
};

export { CornerField };
