import { Icon } from "@design-studio/ui";
import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { StudioPaneHeaderProps } from "./pane-header-types";
import { ProjectMenu } from "./project-menu";

interface PaneProjectProps {
  readonly header: StudioPaneHeaderProps;
  readonly onStartRename: () => void;
  readonly railShortcut: string;
}

const PaneProject = ({
  header,
  onStartRename,
  railShortcut,
}: PaneProjectProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  const toggle = useCallback(() => setOpen((isOpen) => !isOpen), []);

  return (
    <span className="pane-project-anchor">
      <button
        ref={trigger}
        type="button"
        className="pane-project"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={header.name}
        data-tip-off={pick(open, "", null)}
        data-tip-align="start"
        onClick={toggle}
        onDoubleClick={onStartRename}
      >
        <span className="truncate">{header.name}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <ProjectMenu
          header={header}
          onClose={close}
          onStartRename={onStartRename}
          railShortcut={railShortcut}
          trigger={trigger}
        />
      )}
    </span>
  );
};

export { PaneProject };
