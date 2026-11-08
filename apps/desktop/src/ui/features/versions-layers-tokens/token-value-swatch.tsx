import { useMemo } from "react";
import type { ReactNode } from "react";

interface TokenValueSwatchProps {
  readonly paint: string;
}

const TokenValueSwatch = ({ paint }: TokenValueSwatchProps): ReactNode => {
  const style = useMemo(() => ({ background: paint }), [paint]);

  return <span className="tk-swatch" style={style} aria-hidden="true" />;
};

export { TokenValueSwatch };
