import type { ReactElement } from "react";

import { ColorField } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import { PAINT_PROP, usePaintEdit } from "./use-paint-edit.js";

interface PaintFieldProps {
  readonly color: string;
  readonly edit: DirectEdit;
  readonly label: string;
  readonly short: string;
  readonly onColor: (color: string) => void;
}

const PaintField = ({
  color,
  edit,
  label,
  short,
  onColor,
}: PaintFieldProps): ReactElement => {
  const paint = usePaintEdit(edit, color, onColor);

  return (
    <ColorField edit={paint} label={label} prop={PAINT_PROP} short={short} />
  );
};

export { PaintField };
