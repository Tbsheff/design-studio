import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useFitPopover, usePopover } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import { MenuPopup } from "./menu-popup.js";
import type { View } from "./menu-popup.js";
import { NoteLine } from "./note-line.js";
import { currentStyle } from "./style-match.js";
import { useTextStyles } from "./use-text-styles.js";

import styles from "./text-styles.module.css";

interface TextStyleMenuProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly targets: SelectionContext[];
}

const triggerLabel = (hasSource: boolean, label: string): string => {
  if (hasSource) {
    return `${copy.label}: ${label}`;
  }

  return `${copy.label}: ${copy.noSource}`;
};

const nextView = (now: View): View => {
  if (now === "closed") {
    return "list";
  }

  return "closed";
};

const TextStyleMenu = ({
  directionId,
  projectId,
  targets,
}: TextStyleMenuProps): ReactElement => {
  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const state = useTextStyles(ids, targets);
  const [view, setView] = useState<View>("closed");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const current = currentStyle(state.styles, targets);
  const hasSource = targets.some((target) => target.source !== null);
  const open = view !== "closed";

  const close = useCallback((refocus: boolean): void => {
    setView("closed");

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close, trigger);
  useFitPopover(root, trigger, open);

  const toggle = useCallback((): void => {
    setView(nextView);
  }, []);

  return (
    <div className={styles.field}>
      <span className="ins-scrub static">{copy.label}</span>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={triggerLabel(hasSource, current.label)}
        className={styles.trigger}
        disabled={state.busy || !hasSource}
        ref={trigger}
        type="button"
        onClick={toggle}
      >
        <span className={styles.current}>{current.label}</span>
      </button>
      {open && (
        <div className={styles.popup} id={menuId} ref={root}>
          <MenuPopup
            canCreate={targets.length === 1 && hasSource}
            current={current}
            detachable={current.label !== copy.none}
            state={state}
            view={view}
            onClose={close}
            onView={setView}
          />
        </div>
      )}
      <NoteLine note={state.note} />
    </div>
  );
};

export { TextStyleMenu };

export type { TextStyleMenuProps };
