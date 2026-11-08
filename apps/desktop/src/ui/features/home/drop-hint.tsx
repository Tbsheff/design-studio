import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const DropHint = ({
  isOn,
}: {
  readonly isOn: boolean;
}): ReactElement | null => {
  if (!isOn) {
    return null;
  }

  return (
    <div className="home-drop-hint" aria-hidden="true">
      <Icon name="image" size={16} />
      {copy.dropAnAppFolderAn}
    </div>
  );
};

export { DropHint };
