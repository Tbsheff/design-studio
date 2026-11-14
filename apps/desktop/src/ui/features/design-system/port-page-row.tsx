import type { PortFlowPage } from "@design-studio/contracts/port";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PageRow = ({
  page,
  isChecked,
  onToggle,
}: {
  page: PortFlowPage;
  isChecked: boolean;
  onToggle: (path: string) => void;
}): ReactElement => {
  const { path } = page;

  const togglePath = useCallback((): void => onToggle(path), [onToggle, path]);

  return (
    <label className="export-frame port-page" data-tip={page.routeFile}>
      <input type="checkbox" checked={isChecked} onChange={togglePath} />
      <span className="port-page-name truncate">{path}</span>
      <span className="port-page-route mono truncate">{page.url}</span>
      {page.routeExists && isChecked && (
        <span className="port-page-taken truncate">{`${COPY.textUpdates}${page.routeFile ?? page.url}`}</span>
      )}
    </label>
  );
};

export { PageRow };
