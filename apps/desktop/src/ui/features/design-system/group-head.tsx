import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const FOLDER_ICON_SIZE = 12;

const GroupHead = ({
  count,
  folder,
  isShown,
}: {
  count: number;
  folder: string;
  isShown: boolean;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return (
    <h3 className="cmp-group-head" data-tip={folder} data-tip-align="start">
      <Icon name="folder" size={FOLDER_ICON_SIZE} />
      <span className="truncate">{folder}</span>
      <span className="cmp-count">{count}</span>
    </h3>
  );
};

export { GroupHead };
