import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface SheetHeadProps {
  readonly closeLabel: string;
  readonly closeTip: string;
  readonly id: string;
  readonly onClose: () => void;
  readonly onSlot: (el: HTMLDivElement | null) => void;
  readonly title: string;
}

const SheetHead = ({
  closeLabel,
  closeTip,
  id,
  onClose,
  onSlot,
  title,
}: SheetHeadProps): ReactElement => (
  <div className="pane-sheet-head">
    <h2 className="pane-sheet-title" id={id}>
      {title}
    </h2>
    <div className="pane-sheet-slot" ref={onSlot} />
    <button
      type="button"
      className="icon-btn small pane-sheet-close"
      aria-label={closeLabel}
      data-tip={closeTip}
      data-tip-align="end"
      onClick={onClose}
    >
      <Icon name="close" size={14} />
    </button>
  </div>
);

export { SheetHead };
