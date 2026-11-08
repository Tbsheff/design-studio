import type { InsertableComponent } from "@design-studio/contracts/insert";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";

const CardGalleryButton = ({
  component,
  onGallery,
}: {
  component: InsertableComponent;
  onGallery: (component: InsertableComponent) => void;
}): ReactElement => {
  const open = useCallback((): void => {
    onGallery(component);
  }, [component, onGallery]);

  return (
    <button
      type="button"
      className="icon-btn small cmp-insert"
      aria-label={`${COPY.labelShowAllVariants}: ${component.name}`}
      data-tip={COPY.tipShowEveryVariant}
      data-testid="component-gallery"
      onClick={open}
    >
      <Icon name="layers" size={14} />
    </button>
  );
};

export { CardGalleryButton };
