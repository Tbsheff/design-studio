import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactElement } from "react";

import type { ComponentDrag } from "./component-drag-state.js";
import { ComponentGroup } from "./component-group.js";
import type { Item } from "./components-panel-model.js";
import type { MenuAnchor, Props } from "./components-panel-props.js";

const ComponentsGroups = ({
  drag,
  groups,
  onGallery,
  onInsertMenu,
  props,
}: {
  drag: ComponentDrag;
  groups: [string, Item[]][];
  onGallery: (component: InsertableComponent) => void;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
  props: Props;
}): ReactElement | null => {
  if (!props.directionId) {
    return null;
  }

  return (
    <>
      {groups.map(([folder, items]) => (
        <ComponentGroup
          key={folder || "all"}
          drag={drag}
          folder={folder}
          hasHead={groups.length > 1}
          items={items}
          props={props}
          onGallery={onGallery}
          onInsertMenu={onInsertMenu}
        />
      ))}
    </>
  );
};

export { ComponentsGroups };
