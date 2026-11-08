import { useMemo } from "react";
import type { ReactNode } from "react";

interface CompareStageProps {
  readonly children: ReactNode;
  readonly labels: ReactNode;
  readonly width: number;
}

const CompareStage = ({
  children,
  labels,
  width,
}: CompareStageProps): ReactNode => {
  const style = useMemo(() => ({ width }), [width]);

  return (
    <div className="compare-pane single">
      <div className="compare-labels" style={style}>
        {labels}
      </div>
      <div className="compare-stage">{children}</div>
    </div>
  );
};

export { CompareStage };
