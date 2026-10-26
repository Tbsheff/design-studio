import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const SheetSlot = createContext<{ slot: HTMLElement | null } | null>(null);

export function PanelHead({ title, className, titleClassName, children }: { title: string; className: string; titleClassName: string; children?: ReactNode }) {
  const sheet = useContext(SheetSlot);
  if (sheet) return sheet.slot && children ? createPortal(children, sheet.slot) : null;
  return (
    <div className={className}>
      <strong className={titleClassName}>{title}</strong>
      {children}
    </div>
  );
}
