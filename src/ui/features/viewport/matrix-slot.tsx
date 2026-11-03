import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { CellBadges } from "./cell-badges.js";
import { copy } from "./copy.js";
import { Icon, usePopover } from "./deps.js";
import { MatrixPanel } from "./matrix-panel.js";
import { useMatrix } from "./use-matrix.js";
import { useSlot } from "./use-slot.js";

import styles from "./viewport.module.css";

interface SlotProps {
  readonly directionId: string | null;
  readonly frame: { readonly path?: string | undefined };
  readonly projectId: string;
}

const ICON_SIZE = 14;

const MatrixSlot = (props: SlotProps): ReactElement => {
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const slot = useSlot();
  const [isOpen, setIsOpen] = useState(false);

  const matrix = useMatrix({
    directionId: props.directionId,
    page: props.frame.path ?? "",
    projectId: props.projectId,
  });

  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleToggle = useCallback(() => setIsOpen((open) => !open), []);

  usePopover(isOpen, root, handleClose, trigger);

  const count = matrix.report?.findings.length ?? 0;

  const entry = (
    <span className={`topbar-anchor ${styles.anchor}`} ref={root}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={copy.menuLabel}
        className="btn ghost topbar-review"
        data-tip={copy.menuTip}
        data-tip-align="end"
        onClick={handleToggle}
        ref={trigger}
        type="button"
      >
        <Icon name="window" size={ICON_SIZE} />
        <span>{copy.title}</span>
        {count > 0 && <span className={styles.count}>{count}</span>}
      </button>
      {isOpen && <MatrixPanel matrix={matrix} />}
    </span>
  );

  return (
    <>
      {slot && createPortal(entry, slot)}
      {matrix.report && <CellBadges findings={matrix.report.findings} />}
    </>
  );
};

export { MatrixSlot };
