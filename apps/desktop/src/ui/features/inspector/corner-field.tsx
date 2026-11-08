import { useMemo } from "react";
import type { ReactElement } from "react";

import { toCornerPart, toJoinedCorners } from "./corners-model.js";
import type { Side } from "./css-value-model.js";
import { PlainNumberField } from "./plain-number-field.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { createProxyEdit } from "./use-proxy-edit.js";

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
    const edit = createProxyEdit(source, BORDER_RADIUS, corners[side], {
      isMixed: null,
      part: toCornerPart(side),
      real: [BORDER_RADIUS],
      write: (value) => ({
        [BORDER_RADIUS]: toJoinedCorners({ ...corners, [side]: value }),
      }),
    });

    return { edit, label, min: 0, prop: BORDER_RADIUS };
  }, [source, corners, side, label]);

  return (
    <PlainNumberField id={`ins-radius-${side}`} short={short} spec={spec} />
  );
};

export { CornerField };
