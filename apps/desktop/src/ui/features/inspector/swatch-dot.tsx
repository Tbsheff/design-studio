import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

const SwatchDot = ({
  name,
  value,
}: {
  readonly name: string;
  readonly value: string;
}): ReactElement => {
  const style = useMemo<CSSProperties>(() => ({ background: value }), [value]);

  return <span className="swatch" style={style} data-tip={name} />;
};

export { SwatchDot };
