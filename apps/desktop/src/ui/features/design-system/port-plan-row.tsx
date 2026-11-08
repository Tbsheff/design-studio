import type { ReactElement, ReactNode } from "react";

const PlanRow = ({
  label,
  valueClass,
  children,
}: {
  label: string;
  valueClass: string;
  children: ReactNode;
}): ReactElement => (
  <div className="port-plan-row">
    <span className="port-plan-key">{label}</span>
    <span className={valueClass}>{children}</span>
  </div>
);

export { PlanRow };
