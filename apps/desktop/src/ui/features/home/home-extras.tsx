import { shortenHome } from "@design-studio/contracts/folders";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import { Disclosure } from "@design-studio/ui";
import { useEffect, useState } from "react";

import { api, errorText } from "../../api.js";
import type { SettingsDraft } from "../chat/settings-draft-model.js";
import { LocationField } from "./folder-controls.js";
import { NewProjectAdvanced } from "./new-project-advanced.js";
import type { FolderChooser } from "./use-folder-chooser.js";

export { FoldersSection } from "./folder-controls.js";

const HiddenProjectsNote = ({
  homeDir,
  onMoved,
}: {
  readonly homeDir: string | null;
  readonly onMoved: () => void;
}) => {
  const [hidden, setHidden] = useState<{
    readonly count: number;
    readonly target: string;
  } | null>(null);

  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .hiddenProjects()
      .then(setHidden)
      .catch(() => setHidden(null));

  useEffect(() => {
    void load();
  }, []);

  if (!hidden || hidden.count === 0) {
    return null;
  }

  const move = async () => {
    setMoving(true);
    setError(null);

    try {
      const result = await api.moveHiddenProjects();
      const first = result.failed[0];

      if (first) {
        setError(
          `Could not move ${result.failed.length} project${result.failed.length === 1 ? "" : "s"}: ${first.error}`
        );
      }

      if (result.moved.length > 0) {
        onMoved();
      }
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setMoving(false);
      await load();
    }
  };

  return (
    <div className="home-hidden-note" role="status">
      <span>
        {hidden.count === 1
          ? "1 project is in the app's hidden folder"
          : `${hidden.count} projects are in the app's hidden folder`}
      </span>
      <button
        type="button"
        className="btn small"
        onClick={() => void move()}
        disabled={moving}
      >
        {moving ? "Moving…" : `Move to ${shortenHome(hidden.target, homeDir)}`}
      </button>
      {error && <span className="home-hidden-error">{error}</span>}
    </div>
  );
};

export interface ComposerFootProps {
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

export const ComposerFoot = ({
  workspaces,
  location,
  prompt,
  chooser,
  onLocation,
  onAddFolder,
  advanced,
  onHiddenMoved,
}: ComposerFootProps) => {
  const homeDir = workspaces?.homeDir ?? null;

  return (
    <div className="home-foot">
      <div className="home-foot-row">
        <LocationField
          folders={workspaces?.folders ?? []}
          value={location}
          homeDir={homeDir}
          prompt={prompt}
          chooser={chooser}
          onChange={onLocation}
          onAddFolder={onAddFolder}
        />
      </div>
      <NewProjectAdvanced
        key={advanced.opened}
        isInitiallyOpen={advanced.opened > 0}
        draft={advanced.draft}
        onDraft={advanced.onDraft}
        designMd={advanced.designMd}
        onDesignMd={advanced.onDesignMd}
        onError={advanced.onError}
      />
      <Disclosure className="home-disclosure" />
      <HiddenProjectsNote homeDir={homeDir} onMoved={onHiddenMoved} />
    </div>
  );
};
