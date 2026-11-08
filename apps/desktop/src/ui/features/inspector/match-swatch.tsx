import type { StyleKind } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";
import { useMemo } from "react";

const Swatch = ({
  kind,
  value,
}: {
  readonly kind: StyleKind;
  readonly value: string;
}): ReactElement | null => {
  const style = useMemo(() => ({ background: value }), [value]);

  if (kind !== "color") {
    return null;
  }

  return <span className="sm-swatch" style={style} aria-hidden="true" />;
};

export { Swatch };
