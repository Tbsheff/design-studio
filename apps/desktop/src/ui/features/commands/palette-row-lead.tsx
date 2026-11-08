import type { ReactElement } from "react";

import { Icon, ProjectThumb } from "./deps.js";
import type { Row } from "./palette-rows.js";

const RowLead = ({ row }: { row: Row }): ReactElement => {
  if (row.hit && row.kind === "project" && !row.icon) {
    return <ProjectThumb hit={row.hit} />;
  }

  return (
    <span className="cmdk-icon" data-tone={row.tone} aria-hidden="true">
      <Icon name={row.icon ?? "dot"} size={14} />
    </span>
  );
};

export { RowLead };
