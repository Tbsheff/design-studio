import { usePopover } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";

import { CopyCodeMenuList } from "./copy-code-menu-list.js";
import {
  toStatusIcon,
  toStatusLabel,
  toTriggerClass,
} from "./copy-code-model.js";
import type { CopyVariant } from "./copy-code-model.js";
import { CopyCodeTriggerContent } from "./copy-code-trigger-content.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";
import { useCopyCodeItems } from "./use-copy-code-items.js";
import { useCopyStatus } from "./use-copy-status.js";

interface Props {
  readonly directionId: string | null;
  readonly projectId: string;
  readonly selector: string;
  readonly variant?: CopyVariant;
}

const CopyCodeMenu = ({
  directionId,
  projectId,
  selector,
  variant = "icon",
}: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const status = useCopyStatus();

  const close = useCallback((refocus: boolean): void => {
    setIsOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  const handleToggle = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, []);

  usePopover(isOpen, root, close);

  const items = useCopyCodeItems({
    close,
    directionId,
    projectId,
    selector,
    status,
  });

  const { state } = status;

  const label = toStatusLabel(state);
  const isRow = variant === "row";
  const isIdle = state.kind === "idle";

  return (
    <div className="copy-code-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={toTriggerClass(variant, state.kind === "busy")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        data-tip={pick(isOpen || isRow, null, label)}
        data-tip-align="end"
        onClick={handleToggle}
      >
        <CopyCodeTriggerContent
          icon={toStatusIcon(state)}
          isBusy={state.kind === "busy"}
          isOpen={isOpen}
          isRow={isRow}
          text={pick(isIdle, copy.exportSelection, label)}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {pick(isIdle, "", label)}
      </span>
      {isOpen && <CopyCodeMenuList items={items} onClose={close} />}
    </div>
  );
};

export { CopyCodeMenu };
