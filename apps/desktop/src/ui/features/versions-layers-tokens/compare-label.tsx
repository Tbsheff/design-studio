import type { ReactNode } from "react";

interface CompareLabelProps {
  readonly align: "start" | "end";
  readonly side: "A" | "B";
  readonly title: string;
}

const CompareLabel = ({ align, side, title }: CompareLabelProps): ReactNode => (
  <div className={`compare-label ${align}`} data-tip={title}>
    <span className="badge accent">{side}</span>
    <span className="compare-title truncate">{title}</span>
  </div>
);

export { CompareLabel };
