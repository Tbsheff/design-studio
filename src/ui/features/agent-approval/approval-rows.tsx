import type { ReactElement } from "react";

import type { ApprovalRow } from "./approval-card-model.js";

interface ApprovalRowsProps {
  readonly rows: readonly ApprovalRow[];
}

const ApprovalRows = ({ rows }: ApprovalRowsProps): ReactElement => (
  <dl className="permission-rows">
    {rows.map((row) => (
      <div key={`${row.label}:${row.value}`} className="permission-row">
        {row.label && <dt>{row.label}</dt>}
        <dd>{row.value}</dd>
      </div>
    ))}
  </dl>
);

export { ApprovalRows };
