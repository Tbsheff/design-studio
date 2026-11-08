import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactElement } from "react";

import { CardGalleryButton } from "./card-gallery-button.js";
import { CardInsertButton } from "./card-insert-button.js";
import type { MenuAnchor } from "./components-panel-props.js";

const CardInsertActions = ({
  component,
  onGallery,
  onInsertMenu,
}: {
  component: InsertableComponent | null;
  onGallery: (component: InsertableComponent) => void;
  onInsertMenu: (component: InsertableComponent, at: MenuAnchor) => void;
}): ReactElement | null => {
  if (!component) {
    return null;
  }

  return (
    <>
      <CardInsertButton component={component} onInsertMenu={onInsertMenu} />
      <CardGalleryButton component={component} onGallery={onGallery} />
    </>
  );
};

export { CardInsertActions };
