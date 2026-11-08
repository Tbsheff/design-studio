import type { ReactElement } from "react";
import { useMemo } from "react";

const PvColor = ({ name }: { name: string }): ReactElement => {
  const style = useMemo(() => ({ background: `var(--${name})` }), [name]);

  return (
    <li className="pv-color">
      <span className="pv-chip" style={style} aria-hidden="true" />
      <span>{name}</span>
    </li>
  );
};

export { PvColor };
