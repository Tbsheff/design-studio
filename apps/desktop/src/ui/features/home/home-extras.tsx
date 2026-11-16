import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import type { ReactElement } from "react";

import { HiddenProjectsNote } from "./hidden-projects-note.js";
import { LocationField } from "./location-field.js";
import type { FolderChooser } from "./use-folder-chooser.js";
import { useLocationRow } from "./use-location-row.js";

interface ComposerFootProps {
  readonly workspaces: WorkspaceList | null;
  readonly location: string | null;
  readonly prompt: string;
  readonly chooser: FolderChooser;
  readonly onLocation: (path: string | null) => void;
  readonly onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
  readonly onHiddenMoved: () => void;
}

const EMPTY_FOLDERS: WorkspaceFolder[] = [];

const ComposerFoot = ({
  workspaces,
  location,
  prompt,
  chooser,
  onLocation,
  onAddFolder,
  onHiddenMoved,
}: ComposerFootProps): ReactElement => {
  const homeDir = workspaces?.homeDir ?? null;

  const { attachRow, handleLocationPick, isShown } = useLocationRow(
    location,
    onLocation
  );

  return (
    <div className="home-foot">
      {isShown && (
        <div className="home-foot-row" ref={attachRow} tabIndex={-1}>
          <LocationField
            folders={workspaces?.folders ?? EMPTY_FOLDERS}
            value={location}
            homeDir={homeDir}
            prompt={prompt}
            chooser={chooser}
            onChange={handleLocationPick}
            onAddFolder={onAddFolder}
          />
        </div>
      )}
      <HiddenProjectsNote homeDir={homeDir} onMoved={onHiddenMoved} />
    </div>
  );
};

export { ComposerFoot };

export type { ComposerFootProps };
