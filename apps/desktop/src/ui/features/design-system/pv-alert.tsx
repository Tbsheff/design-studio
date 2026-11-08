import type { ReactElement } from "react";
import { useMemo } from "react";

const PvAlert = ({
  text,
  tone,
}: {
  text: string;
  tone: string;
}): ReactElement => {
  const line = useMemo(() => ({ borderColor: `var(--${tone})` }), [tone]);
  const dot = useMemo(() => ({ background: `var(--${tone})` }), [tone]);

  return (
    <span className="pv-alert" style={line}>
      <span className="pv-dot" style={dot} aria-hidden="true" />
      {text}
    </span>
  );
};

export { PvAlert };
