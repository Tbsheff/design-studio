import { useCallback } from "react";
import type { KeyboardEvent, ReactElement, ReactNode, Ref } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import { pick } from "../../platform/pick.js";
import { menuKeys } from "./composer-menu-keys.js";
import type { UsePlacedPopoverResult } from "./composer-menu-model.js";

const MenuPanel = ({
  panel,
  menu,
  menuClass,
  label,
  children,
}: {
  panel: Ref<HTMLDivElement>;
  menu: UsePlacedPopoverResult;
  menuClass: string;
  label: string;
  children: ReactNode;
}): ReactElement | null => {
  const body = useDocumentBody();
  const { close } = menu;

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => menuKeys(event, close),
    [close]
  );

  if (!menu.shown || !body) {
    return null;
  }

  const panelElement = (
    <div
      tabIndex={0}
      ref={panel}
      className={`ui-menu composer-menu ${menuClass}`}
      role="menu"
      aria-label={label}
      data-closing={pick(menu.closing, "true", null)}
      inert={menu.closing}
      style={menu.style}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );

  return <>{createPortal(panelElement, body)}</>;
};

export { MenuPanel };
