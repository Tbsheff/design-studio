import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import type { ReactElement } from "react";

import type { SettingsDraft } from "../chat/settings-draft-model.js";
import { HiddenProjectsNote } from "./hidden-projects-note.js";
import { LocationField } from "./location-field.js";
import { NewProjectAdvanced } from "./new-project-advanced.js";
import type { FolderChooser } from "./use-folder-chooser.js";

interface ComposerFootProps {
  readonly workspaces: WorkspaceList | null;
  readonly location: string | null;
  readonly prompt: string;
  readonly chooser: FolderChooser;
  readonly onLocation: (path: string | null) => void;
  readonly onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
  readonly advanced: {
    readonly opened: number;
    readonly draft: SettingsDraft;
    readonly onDraft: (next: SettingsDraft) => void;
    readonly designMd: string;
    readonly onDesignMd: (value: string) => void;
    readonly onError: (message: string) => void;
  };
  readonly onHiddenMoved: () => void;
}

const EMPTY_FOLDERS: WorkspaceFolder[] = [];

const toLocationMark = (location: string | null): string => {
  if (location === null) {
    return "default";
  }

  return "custom";
};

const ComposerFoot = ({
  workspaces,
  location,
  prompt,
  chooser,
  onLocation,
  onAddFolder,
  advanced,
  onHiddenMoved,
}: ComposerFootProps): ReactElement => {
  const homeDir = workspaces?.homeDir ?? null;
  const { designMd, draft, onDesignMd, onDraft, onError, opened } = advanced;

  return (
    <div className="home-foot" data-location={toLocationMark(location)}>
      <div className="home-foot-row">
        <LocationField
          folders={workspaces?.folders ?? EMPTY_FOLDERS}
          value={location}
          homeDir={homeDir}
          prompt={prompt}
          chooser={chooser}
          onChange={onLocation}
          onAddFolder={onAddFolder}
        />
      </div>
      <NewProjectAdvanced
        key={opened}
        isInitiallyOpen={opened > 0}
        draft={draft}
        onDraft={onDraft}
        designMd={designMd}
        onDesignMd={onDesignMd}
        onError={onError}
      />
      <HiddenProjectsNote homeDir={homeDir} onMoved={onHiddenMoved} />
    </div>
  );
};

export { ComposerFoot };

export type { ComposerFootProps };
