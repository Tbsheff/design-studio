import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactElement } from "react";

import { ComponentCard } from "./component-card.js";
import type { ComponentDrag } from "./component-drag-state.js";
import type { Item } from "./components-panel-model.js";
import type { MenuAnchor, Props } from "./components-panel-props.js";
import { GroupHead } from "./group-head.js";

const ComponentGroup = ({
  drag,
  folder,
  hasHead,
  items,
  onGallery,
  onInsertMenu,
  props,
}: {
  drag: ComponentDrag;
  folder: string;
  hasHead: boolean;
  items: Item[];
  onGallery: (component: InsertableComponent) => void;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
  props: Props;
}): ReactElement => (
  <section className="cmp-group" aria-label={folder || "Components"}>
    <GroupHead count={items.length} folder={folder} isShown={hasHead} />
    <ul className="cmp-grid">
      {items.map((item) => (
        <ComponentCard
          key={item.key}
          item={item}
          props={props}
          drag={drag}
          onInsertMenu={onInsertMenu}
          onGallery={onGallery}
        />
      ))}
    </ul>
  </section>
);

export { ComponentGroup };
