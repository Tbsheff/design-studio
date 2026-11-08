import { useMemo } from "react";
import type { ReactNode } from "react";

interface TokenValueSwatchProps {
  readonly isSmall: boolean;
  readonly paint: string;
}

const TokenValueSwatch = ({
  isSmall,
  paint,
}: TokenValueSwatchProps): ReactNode => {
  const style = useMemo(() => ({ background: paint }), [paint]);
  let className = "tk-swatch";

  if (isSmall) {
    className = "tk-swatch sm";
  }

  return <span className={className} style={style} aria-hidden="true" />;
};

export { TokenValueSwatch };
