import { useFitPopover, usePopover } from "@design-studio/ui";
import { useCallback, useRef } from "react";
import type { ReactElement, RefObject } from "react";

import { MenuSection } from "./menu-section";
import type { StudioPaneHeaderProps } from "./pane-header-types";
import { toNavItems, toProjectItems } from "./pane-menu-model";

interface ProjectMenuProps {
  readonly header: StudioPaneHeaderProps;
  readonly onClose: (refocus: boolean) => void;
  readonly onStartRename: () => void;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const toKindLabel = (header: StudioPaneHeaderProps): string => {
  if (header.directionName) {
    return `${header.kindLabel} · ${header.directionName}`;
  }

  return header.kindLabel;
};

const ProjectMenu = ({
  header,
  onClose,
  onStartRename,
  trigger,
}: ProjectMenuProps): ReactElement => {
  const root = useRef<HTMLDivElement>(null);

  usePopover(true, root, onClose, trigger);
  useFitPopover(root, trigger, true);

  const done = useCallback((): void => onClose(false), [onClose]);

  return (
    <div
      ref={root}
      className="ui-menu pane-project-menu"
      role="menu"
      aria-label="Project"
      tabIndex={-1}
    >
      <MenuSection
        items={toProjectItems(header, onStartRename)}
        label={toKindLabel(header)}
        onDone={done}
      />
      <MenuSection items={toNavItems(header)} label={null} onDone={done} />
    </div>
  );
};

export { ProjectMenu };
