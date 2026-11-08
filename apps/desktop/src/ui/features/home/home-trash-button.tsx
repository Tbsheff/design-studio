import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { loadTrash } from "./lazy-parts.js";

const preloadTrash = (): void => {
  loadTrash();
};

const HomeTrashButton = ({
  onTrash,
}: {
  readonly onTrash: () => void;
}): ReactElement => (
  <button
    type="button"
    className="btn small ghost"
    onPointerEnter={preloadTrash}
    onClick={onTrash}
  >
    <Icon name="trash" size={14} />
    {copy.trash}
  </button>
);

export { HomeTrashButton };
