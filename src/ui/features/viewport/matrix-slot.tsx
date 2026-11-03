import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";

import { CellBadges } from "./cell-badges.js";
import { copy } from "./copy.js";
import { Icon, usePopover } from "./deps.js";
import { MatrixPanel } from "./matrix-panel.js";
import { useMatrix } from "./use-matrix.js";

import styles from "./viewport.module.css";

interface SlotProps {
  readonly directionId: string | null;
  readonly frame: { readonly path?: string | undefined };
  readonly frameLabelOf: (frameId: string) => Element | null;
  readonly onJumpToFrame: (frameId: string) => void;
  readonly projectId: string;
}

const ICON_SIZE = 14;

const MatrixSlot = (props: SlotProps): ReactElement => {
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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

  return (
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
      {isOpen && <MatrixPanel matrix={matrix} onJump={props.onJumpToFrame} />}
      {matrix.report && (
        <CellBadges
          findings={matrix.report.findings}
          hostOf={props.frameLabelOf}
        />
      )}
    </span>
  );
};

export { MatrixSlot };

export type { SlotProps };
