import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactElement } from "react";

import type { ComponentDrag } from "./component-drag-state.js";
import { ComponentsError } from "./components-error.js";
import { ComponentsGroups } from "./components-groups.js";
import { ComponentsNotice } from "./components-notice.js";
import { groupsOf, toEmptyText } from "./components-panel-model.js";
import type { Item } from "./components-panel-model.js";
import type { MenuAnchor, Props } from "./components-panel-props.js";
import { ComponentsSkeleton } from "./components-skeleton.js";
import { COPY } from "./copy.js";

const toEmpty = (all: Item[] | null, canInsert: boolean): string | null => {
  if (all !== null && all.length === 0) {
    return toEmptyText(canInsert);
  }

  return null;
};

const toNoMatch = (
  all: Item[] | null,
  shown: Item[],
  query: string
): string | null => {
  if (all !== null && all.length > 0 && shown.length === 0) {
    return `${COPY.textNoComponentsMatch}${query}${COPY.textGlyph}`;
  }

  return null;
};

const ComponentsScroll = ({
  all,
  canInsert,
  drag,
  error,
  onGallery,
  onInsertMenu,
  props,
  query,
  retry,
  shown,
}: {
  all: Item[] | null;
  canInsert: boolean;
  drag: ComponentDrag;
  error: string | null;
  onGallery: (component: InsertableComponent) => void;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
  props: Props;
  query: string;
  retry: (() => void) | null;
  shown: Item[];
}): ReactElement => (
  <div className="cmp-scroll">
    <ComponentsError message={error} onRetry={retry} />
    <ComponentsSkeleton isShown={all === null && !error} />
    <ComponentsNotice text={toEmpty(all, canInsert)} />
    <ComponentsNotice text={toNoMatch(all, shown, query)} />
    <ComponentsGroups
      drag={drag}
      groups={groupsOf(shown)}
      props={props}
      onGallery={onGallery}
      onInsertMenu={onInsertMenu}
    />
  </div>
);

export { ComponentsScroll };
