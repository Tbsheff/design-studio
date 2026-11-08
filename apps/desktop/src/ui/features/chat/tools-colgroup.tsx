import type { ReactElement } from "react";

const ToolsColgroup = ({
  hasErrorColumn,
}: {
  hasErrorColumn: boolean;
}): ReactElement => (
  <colgroup>
    <col className="tools-col-tool" />
    <col />
    <col className="tools-col-time" />
    {hasErrorColumn && <col className="tools-col-flag" />}
  </colgroup>
);

export { ToolsColgroup };
