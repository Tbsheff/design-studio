import type { ReactElement } from "react";
import { useMemo } from "react";

const PvTypeRow = ({
  family,
  label,
  sample,
  size,
}: {
  family: string;
  label: string;
  sample: string;
  size: string;
}): ReactElement => {
  const style = useMemo(
    () => ({ fontFamily: family, fontSize: size }),
    [family, size]
  );

  return (
    <div className="pv-type-row">
      <code>{label}</code>
      <span style={style}>{sample}</span>
    </div>
  );
};

export { PvTypeRow };
