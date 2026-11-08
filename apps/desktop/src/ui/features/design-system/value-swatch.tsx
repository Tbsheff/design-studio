import type { ReactElement } from "react";
import { useMemo } from "react";

const ValueSwatch = ({
  isColor,
  value,
}: {
  isColor: boolean;
  value: string;
}): ReactElement | null => {
  const style = useMemo(() => ({ background: value }), [value]);

  if (!isColor) {
    return null;
  }

  return <span className="swatch" style={style} aria-hidden="true" />;
};

export { ValueSwatch };
