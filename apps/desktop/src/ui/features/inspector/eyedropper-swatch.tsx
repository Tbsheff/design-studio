import { memo, useMemo } from "react";
import type { ReactElement } from "react";

const EyedropperSwatchView = ({
  color,
}: {
  readonly color: string;
}): ReactElement => {
  const style = useMemo(() => ({ background: color }), [color]);

  return <span className="tk-swatch" style={style} aria-hidden="true" />;
};

const EyedropperSwatch = memo(EyedropperSwatchView);

export { EyedropperSwatch };
