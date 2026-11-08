import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const EMPTY_ICON_SIZE = 16;

const TrashEmptyNote = (): ReactElement => (
  <div className="trash-empty">
    <Icon name="trash" size={EMPTY_ICON_SIZE} />
    <strong>{copy.trashIsEmpty}</strong>
    <span>{copy.deletedProjectsStayHereUntil}</span>
  </div>
);

export { TrashEmptyNote };
