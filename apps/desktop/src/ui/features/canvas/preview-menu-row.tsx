import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { KeyHint } from "../../canvas-preview-slots.js";
import type { PreviewMenuItem } from "./preview-menu-model.js";
import { PreviewSubmenuRow } from "./preview-submenu-row.js";

interface PreviewMenuRowProps {
  readonly item: PreviewMenuItem;
  readonly onClose: () => void;
  readonly bindRef: (id: string) => (element: HTMLButtonElement | null) => void;
}

const toAriaDisabled = (item: PreviewMenuItem): true | undefined => {
  if (item.disabled) {
    return true;
  }
};

const toKeyNode = (item: PreviewMenuItem): ReactElement => {
  if (item.keyId) {
    return <KeyHint id={item.keyId} />;
  }

  return <span />;
};

const PreviewMenuRow = ({
  item,
  onClose,
  bindRef,
}: PreviewMenuRowProps): ReactElement => {
  const onRowClick = useCallback((): void => {
    if (item.disabled) {
      return;
    }

    onClose();
    item.run();
  }, [item, onClose]);

  if (item.submenu) {
    return (
      <>
        {item.divider && <hr className="preview-menu-divider" />}
        <PreviewSubmenuRow item={item} bindRef={bindRef} />
      </>
    );
  }

  return (
    <>
      {item.divider && <hr className="preview-menu-divider" />}
      <button
        ref={bindRef(item.id)}
        type="button"
        role="menuitem"
        aria-disabled={toAriaDisabled(item)}
        data-tip={item.disabled}
        data-tip-align="end"
        onClick={onRowClick}
      >
        <Icon name={item.icon} size={14} />
        <span>{item.label}</span>
        {toKeyNode(item)}
      </button>
    </>
  );
};

export { PreviewMenuRow };
