import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import { CellBadges } from "./cell-badges.js";
import { MATRIX_EVENT, usePopover } from "./deps.js";
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

  useEffect(() => {
    const onOpen = (): void => setIsOpen((open) => !open);

    globalThis.addEventListener(MATRIX_EVENT, onOpen);

    return (): void => globalThis.removeEventListener(MATRIX_EVENT, onOpen);
  }, []);

  usePopover(isOpen, root, handleClose, trigger);

  return (
    <span className={`topbar-anchor ${styles.anchor}`} ref={root}>
      <button
        aria-hidden
        className={styles.trigger}
        ref={trigger}
        tabIndex={-1}
        type="button"
      />
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
