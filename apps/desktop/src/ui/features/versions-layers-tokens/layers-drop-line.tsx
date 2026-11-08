import { useMemo } from "react";
import type { ReactNode } from "react";

interface LayersDropLineProps {
  readonly line: number;
}

const LayersDropLine = ({ line }: LayersDropLineProps): ReactNode => {
  const style = useMemo(() => ({ top: line }), [line]);

  return (
    <div className="layers-drop" data-testid="layers-drop" style={style} />
  );
};

export { LayersDropLine };
