import { useEffect, useState } from 'react';
import { shortenHome, type WorkspaceFolder, type WorkspaceList } from '../../shared/folders';
import { api, errorText } from '../api';
import type { SettingsDraft } from '../settingsDraft';
import type { FolderChooser } from '../useFolderChooser';
import { Disclosure } from './Disclosure';
import { LocationField } from './FolderControls';
import { NewProjectAdvanced } from './NewProjectAdvanced';

export { FoldersSection } from './FolderControls';

function HiddenProjectsNote({ homeDir, onMoved }: { homeDir: string | null; onMoved: () => void }) {
  const [hidden, setHidden] = useState<{ count: number; target: string } | null>(null);
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
  if (!hidden || hidden.count === 0) return null;
  const move = async () => {
    setMoving(true);
    setError(null);
    try {
      const result = await api.moveHiddenProjects();
      const first = result.failed[0];
      if (first) setError(`Could not move ${result.failed.length} project${result.failed.length === 1 ? '' : 's'}: ${first.error}`);
      if (result.moved.length > 0) onMoved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setMoving(false);
      await load();
    }
  };
  return (
    <div className="home-hidden-note" role="status">
      <span>{hidden.count === 1 ? "1 project is in the app's hidden folder" : `${hidden.count} projects are in the app's hidden folder`}</span>
      <button type="button" className="btn small" onClick={() => void move()} disabled={moving}>
        {moving ? 'Moving…' : `Move to ${shortenHome(hidden.target, homeDir)}`}
      </button>
      {error && <span className="home-hidden-error">{error}</span>}
    </div>
  );
}

export interface ComposerFootProps {
  workspaces: WorkspaceList | null;
  location: string | null;
  prompt: string;
  chooser: FolderChooser;
  onLocation: (path: string | null) => void;
  onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
  advanced: { opened: number; draft: SettingsDraft; onDraft: (next: SettingsDraft) => void; designMd: string; onDesignMd: (value: string) => void; onError: (message: string) => void };
  onHiddenMoved: () => void;
}

export function ComposerFoot({ workspaces, location, prompt, chooser, onLocation, onAddFolder, advanced, onHiddenMoved }: ComposerFootProps) {
  const homeDir = workspaces?.homeDir ?? null;
  return (
    <div className="home-foot">
      <div className="home-foot-row">
        <LocationField folders={workspaces?.folders ?? []} value={location} homeDir={homeDir} prompt={prompt} chooser={chooser} onChange={onLocation} onAddFolder={onAddFolder} />
      </div>
      <NewProjectAdvanced key={advanced.opened} initiallyOpen={advanced.opened > 0} draft={advanced.draft} onDraft={advanced.onDraft} designMd={advanced.designMd} onDesignMd={advanced.onDesignMd} onError={advanced.onError} />
      <Disclosure className="home-disclosure" />
      <HiddenProjectsNote homeDir={homeDir} onMoved={onHiddenMoved} />
    </div>
  );
}
