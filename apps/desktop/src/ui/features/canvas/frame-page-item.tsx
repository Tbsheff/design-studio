import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { isCurrentPage, pageLabel } from "./page-name-model.js";

const FramePageItem = ({
  page,
  path,
  routes,
  pick,
}: {
  page: string;
  path: string;
  routes: boolean;
  pick: (raw: string) => boolean;
}): ReactElement => {
  const isCurrent = isCurrentPage(page, path, routes);

  const choose = useCallback((): void => {
    let argument: string = page;

    if (page === "index.html") {
      argument = "";
    }

    pick(argument);
  }, [page, pick]);

  return (
    <button
      type="button"
      role="menuitem"
      aria-current={isCurrent}
      onClick={choose}
    >
      <Icon name="file" size={14} />
      <span className="truncate">{pageLabel(page, routes)}</span>
      {isCurrent && <Icon name="check" size={14} />}
    </button>
  );
};

export { FramePageItem };
