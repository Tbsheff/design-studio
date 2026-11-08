import type { SelectionContext } from "@design-studio/contracts";
import type {
  InsertPosition,
  InsertableComponent,
} from "@design-studio/contracts/insert";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { PreviewMenu } from "../canvas/preview-menu.js";
import type { PreviewMenuItem } from "../canvas/preview-menu.js";
import { NO_SOURCE } from "../inspector/structure-edits.js";
import { insertBus } from "./component-insert-api.js";
import type { MenuAnchor } from "./components-panel-props.js";

const SELECT_FIRST = "Select an element on the canvas first.";

const toBlockReason = (
  selection: SelectionContext | undefined
): string | null => {
  if (!selection) {
    return SELECT_FIRST;
  }

  if (!selection.source && !selection.owners?.length) {
    return NO_SOURCE;
  }

  return null;
};

interface MenuSpec {
  disabled: string | null;
  icon: PreviewMenuItem["icon"];
  id: string;
  label: string;
  position: InsertPosition;
}

const toMenuItem = (
  component: InsertableComponent,
  spec: MenuSpec
): PreviewMenuItem => {
  const item: PreviewMenuItem = {
    icon: spec.icon,
    id: spec.id,
    label: spec.label,
    run: () => insertBus.get()?.insert(component, spec.position),
  };

  if (spec.disabled) {
    return { ...item, disabled: spec.disabled };
  }

  return item;
};

const InsertMenu = ({
  at,
  component,
  onClose,
  selection,
}: {
  at: MenuAnchor;
  component: InsertableComponent;
  onClose: () => void;
  selection: SelectionContext | undefined;
}): ReactElement => {
  const tag = selection?.tag.toLowerCase() ?? "selection";

  const items = useMemo(() => {
    const disabled = toBlockReason(selection);

    return [
      toMenuItem(component, {
        disabled,
        icon: "frame",
        id: "insert-inside",
        label: `Insert inside ${tag}`,
        position: "inside",
      }),
      toMenuItem(component, {
        disabled,
        icon: "arrowDown",
        id: "insert-after",
        label: `Insert after ${tag}`,
        position: "after",
      }),
    ];
  }, [component, selection, tag]);

  return (
    <PreviewMenu
      at={at}
      label={`Insert ${component.name}`}
      items={items}
      onClose={onClose}
    />
  );
};

export { InsertMenu };
