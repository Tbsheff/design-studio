import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";

const SheetSlot = createContext<{ slot: HTMLElement | null } | null>(null);

const PanelHead = ({
  title,
  className,
  titleClassName,
  children,
}: {
  title: string;
  className: string;
  titleClassName: string;
  children?: ReactNode;
}): ReactElement | null => {
  const sheet = useContext(SheetSlot);

  if (sheet) {
    if (sheet.slot && children) {
      return createPortal(children, sheet.slot);
    }

    return null;
  }

  return (
    <div className={className}>
      <strong className={titleClassName}>{title}</strong>
      {children}
    </div>
  );
};

export { SheetSlot, PanelHead };
