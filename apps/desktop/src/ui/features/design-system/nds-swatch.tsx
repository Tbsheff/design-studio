import { useMemo } from "react";
import type { ReactElement } from "react";

const Swatch = ({ color }: { color: string }): ReactElement => {
  const style = useMemo(() => ({ background: color }), [color]);

  return <span style={style} />;
};

export { Swatch };
