import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import { PROJECT_RENAME_EVENT } from "../../platform/project-events";
import { copy } from "./copy";
import type { StudioPaneHeaderProps } from "./pane-header-types";
import { PaneProject } from "./pane-project";
import { ProjectListToggle } from "./project-list-toggle";
import { RenameField } from "./rename-field";

interface StudioTopBarProps {
  readonly header: StudioPaneHeaderProps;
  readonly onEnd: (node: HTMLDivElement | null) => void;
  readonly onStart: (node: HTMLDivElement | null) => void;
}

const StudioTopBar = ({
  header,
  onEnd,
  onStart,
}: StudioTopBarProps): ReactElement => {
  const [isRenaming, setIsRenaming] = useState(false);
  const { onRename } = header;

  const startRename = useCallback(() => setIsRenaming(true), []);

  useEffect(() => {
    globalThis.addEventListener(PROJECT_RENAME_EVENT, startRename);

    return (): void =>
      globalThis.removeEventListener(PROJECT_RENAME_EVENT, startRename);
  }, [startRename]);

  const finishRename = useCallback(
    (next: string | null): void => {
      setIsRenaming(false);

      if (next) {
        void onRename(next);
      }
    },
    [onRename]
  );

  return (
    <header className="studio-top" aria-label={copy.topBar}>
      <div className="studio-top-start">
        <ProjectListToggle />
        {isRenaming && <RenameField name={header.name} onDone={finishRename} />}
        {!isRenaming && (
          <PaneProject header={header} onStartRename={startRename} />
        )}
        <div className="studio-top-host" ref={onStart} />
      </div>
      <div className="studio-top-end" ref={onEnd} />
    </header>
  );
};

export { StudioTopBar };
