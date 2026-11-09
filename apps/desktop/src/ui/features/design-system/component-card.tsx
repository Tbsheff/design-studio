import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactElement } from "react";

import { CardButton } from "./card-button.js";
import { CardInsertActions } from "./card-insert-actions.js";
import { CardThumb } from "./component-card-face.js";
import type { ComponentDrag } from "./component-drag-state.js";
import { ComponentUsageCount } from "./component-usage-count.js";
import { toMeta } from "./components-panel-model.js";
import type { Item } from "./components-panel-model.js";
import type { MenuAnchor, Props } from "./components-panel-props.js";

const toCardHandlers = (
  drag: ComponentDrag,
  item: Item
): ReturnType<ComponentDrag["handlers"]> | null => {
  if (!item.insert) {
    return null;
  }

  return drag.handlers(item.insert);
};

const ComponentCard = ({
  drag,
  item,
  onGallery,
  onInsertMenu,
  props,
}: {
  drag: ComponentDrag;
  item: Item;
  onGallery: (component: InsertableComponent) => void;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
  props: Props;
}): ReactElement => (
  <li className="cmp-item">
    <CardButton
      handlers={toCardHandlers(drag, item)}
      item={item}
      onMention={props.onMention}
    >
      <CardThumb item={item} props={props} />
      <span className="cmp-name truncate">{item.info.name}</span>
      <span className="cmp-meta truncate">{toMeta(item.info)}</span>
    </CardButton>
    <ComponentUsageCount usageKey={item.key} />
    <CardInsertActions
      component={item.insert}
      onGallery={onGallery}
      onInsertMenu={onInsertMenu}
    />
  </li>
);

export { ComponentCard };
