import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const MENU_ICON_SIZE = 16;

const CreateItem = ({
  onCreate,
}: {
  readonly onCreate: () => void;
}): ReactNode => (
  <button type="button" role="menuitem" className="tk-item" onClick={onCreate}>
    <Icon name="plus" size={MENU_ICON_SIZE} />
    <span>{COPY.rawCreate}</span>
  </button>
);

export { CreateItem };
