import { useMemo } from "react";
import type { ReactNode } from "react";

const TokenSwatch = ({ color }: { readonly color: string }): ReactNode => {
  const style = useMemo(() => ({ background: color }), [color]);

  return <span className="tk-swatch sm" style={style} aria-hidden="true" />;
};

export { TokenSwatch };
