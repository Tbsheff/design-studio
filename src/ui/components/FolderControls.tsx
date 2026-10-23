import { useRef, useState, type FormEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { nameFromPrompt, projectsInFolder, shortenHome, slugify, type WorkspaceFolder, type WorkspaceList } from '../../shared/folders';
import { errorText } from '../api';
import { pickFolder } from '../folderPicker';
import { Icon } from './Icon';

type ChooseResult = { path: string; unsupported: false } | { path: null; unsupported: boolean };

interface FolderChooser {
  choose: (title: string, defaultPath?: string) => Promise<ChooseResult>;
  unsupported: boolean;
  picking: boolean;
}

export function useFolderChooser(onError: (message: string) => void): FolderChooser {
  const [unsupported, setUnsupported] = useState(false);
  const [picking, setPicking] = useState(false);
  const choose = async (title: string, defaultPath?: string): Promise<ChooseResult> => {
    setPicking(true);
    try {
      const outcome = await pickFolder({ title, ...(defaultPath ? { defaultPath } : {}) });
      if (outcome.kind === 'unsupported') setUnsupported(true);
      return outcome.kind === 'picked' ? { path: outcome.path, unsupported: false } : { path: null, unsupported: outcome.kind === 'unsupported' };
    } catch (err) {
      onError(errorText(err));
      return { path: null, unsupported: false };
    } finally {
      setPicking(false);
    }
  };
  return { choose, unsupported, picking };
}

function FolderPath({ path, homeDir }: { path: string; homeDir: string | null }) {
  const short = shortenHome(path, homeDir);
  const cut = short.lastIndexOf('/');
  const head = cut > 0 ? short.slice(0, cut + 1) : '';
  const tail = cut > 0 ? short.slice(cut + 1) : short;
  return (
    <span className="folder-path" title={path}>
      {head && <span className="folder-path-head">{head}</span>}
      <span className="folder-path-tail">{tail}</span>
    </span>
  );
}

function PastePath({ label, action, onSubmit }: { label: string; action: string; onSubmit: (path: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="paste-path"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <input aria-label={label} value={value} onChange={(e) => setValue(e.target.value)} placeholder="/Users/me/projects" spellCheck={false} autoFocus />
      <button className="btn small" type="submit" disabled={!value.trim()}>
        {action}
      </button>
    </form>
  );
}

interface OpenFolderProps {
  busy: boolean;
  path: string;
  homeDir: string | null;
  chooser: FolderChooser;
  onPath: (path: string) => void;
  onImport: (path: string) => void;
}

export function OpenFolder({ busy, path, homeDir, chooser, onPath, onImport }: OpenFolderProps) {
  const [paste, setPaste] = useState(false);
  const pasteMode = paste || chooser.unsupported;
  const choose = async () => {
    const picked = await chooser.choose('Choose a folder to open', path || undefined);
    if (picked.path) onPath(picked.path);
  };
  return (
    <div className="open-folder-block">
      <form
        className="open-folder"
        aria-label="Open a folder"
        onSubmit={(e) => {
          e.preventDefault();
          if (path.trim()) onImport(path.trim());
        }}
      >
        <Icon name="folder" />
        <span className="open-folder-label">Open a folder</span>
        {pasteMode ? (
          <>
            <label className="sr-only" htmlFor="open-folder-path">
              Absolute path
            </label>
            <input id="open-folder-path" value={path} onChange={(e) => onPath(e.target.value)} placeholder="/Users/me/projects/site" spellCheck={false} autoFocus={paste} />
          </>
        ) : path ? (
          <FolderPath path={path} homeDir={homeDir} />
        ) : (
          <span className="open-folder-hint">A folder with an index.html or a Vite app</span>
        )}
        {!pasteMode && (
          <button type="button" className="btn small" onClick={() => void choose()} disabled={busy || chooser.picking}>
            {path ? 'Change…' : 'Choose folder…'}
          </button>
        )}
        {(pasteMode || path.trim() !== '') && (
          <button className="btn small" type="submit" disabled={busy || !path.trim()}>
            {busy ? 'Opening…' : 'Open'}
          </button>
        )}
      </form>
      {chooser.unsupported ? (
        <p className="open-folder-note">The folder picker needs macOS. Paste the full path.</p>
      ) : (
        <button type="button" className="link open-folder-toggle" aria-expanded={paste} aria-controls="open-folder-path" onClick={() => setPaste((open) => !open)}>
          {paste ? 'Use the folder picker' : 'Or paste a path'}
        </button>
      )}
    </div>
  );
}

const DEFAULT = 'default';
const CHOOSE = 'choose';

interface LocationProps {
  folders: WorkspaceFolder[];
  value: string | null;
  homeDir: string | null;
  prompt: string;
  chooser: FolderChooser;
  onChange: (path: string | null) => void;
  onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
}

export function LocationField({ folders, value, homeDir, prompt, chooser, onChange, onAddFolder }: LocationProps) {
  const [pasting, setPasting] = useState(false);
  const fallback = folders.find((folder) => folder.default) ?? null;
  const usable = folders.filter((folder) => !folder.missing && !folder.default);
  const parent = value ?? fallback?.path ?? null;
  const target = parent ? `${parent}/${slugify(nameFromPrompt(prompt))}` : null;
  const useFolder = async (path: string) => {
    const saved = await onAddFolder(path);
    if (saved) {
      setPasting(false);
      onChange(saved.path);
    }
  };
  const pick = async () => {
    if (chooser.unsupported) {
      setPasting(true);
      return;
    }
    const picked = await chooser.choose('Choose where to save the new project', value ?? undefined);
    if (picked.path) await useFolder(picked.path);
    else if (picked.unsupported) setPasting(true);
  };
  return (
    <div className="home-location">
      <label htmlFor="new-project-location">Location</label>
      <select
        id="new-project-location"
        className="select"
        value={value ?? DEFAULT}
        disabled={chooser.picking}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CHOOSE) void pick();
          else {
            setPasting(false);
            onChange(next === DEFAULT ? null : next);
          }
        }}
      >
        <option value={DEFAULT}>{fallback?.label ?? 'Design Studio'}</option>
        {usable.map((folder) => (
          <option key={folder.id} value={folder.path}>
            {folder.label}
          </option>
        ))}
        {value && !usable.some((folder) => folder.path === value) && <option value={value}>{shortenHome(value, homeDir)}</option>}
        <option value={CHOOSE}>{chooser.unsupported ? 'Paste a folder path…' : 'Choose folder…'}</option>
      </select>
      {pasting ? (
        <PastePath label="Folder for the new project" action="Use folder" onSubmit={(path) => void useFolder(path)} />
      ) : (
        <span className="home-location-target" data-testid="location-target">
          {target && (
            <>
              New folder <FolderPath path={target} homeDir={homeDir} />
            </>
          )}
        </span>
      )}
    </div>
  );
}

interface FolderRowProps {
  folder: WorkspaceFolder;
  count: number;
  active: boolean;
  homeDir: string | null;
  onFilter: () => void;
  onNewHere: () => void;
  onOpenHere: () => void;
  onRename: (label: string) => Promise<boolean>;
  onRemove: () => void;
  onChangeDefault: () => void;
  changing: boolean;
}

function FolderRow({ folder, count, active, homeDir, onFilter, onNewHere, onOpenHere, onRename, onRemove, onChangeDefault, changing }: FolderRowProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(folder.label);
  const renameRef = useRef<HTMLButtonElement>(null);
  const stopEditing = () => {
    setEditing(false);
    window.requestAnimationFrame(() => renameRef.current?.focus());
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next = label.trim();
    if (!next || next === folder.label) {
      setLabel(folder.label);
      stopEditing();
      return;
    }
    if (await onRename(next)) stopEditing();
  };
  return (
    <li className={`folder-row${folder.missing ? ' missing' : ''}${active ? ' active' : ''}`}>
      {editing ? (
        <form className="folder-rename" onSubmit={(e) => void save(e)}>
          <input
            aria-label={`Name for ${folder.label}`}
            value={label}
            maxLength={80}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setLabel(folder.label);
                stopEditing();
              }
            }}
          />
          <button className="btn small" type="submit">
            Save
          </button>
        </form>
      ) : (
        <button type="button" className="folder-main" aria-pressed={active} onClick={onFilter} title={active ? 'Show all projects' : `Show projects in ${folder.label}`}>
          <Icon name="folder" size={16} />
          <span className="folder-text">
            <span className="folder-label">
              {folder.label}
              {folder.default && <span className="badge folder-default">Default</span>}
            </span>
            <FolderPath path={folder.path} homeDir={homeDir} />
          </span>
          {folder.missing ? (
            <span className="badge fail" title="This folder was moved or deleted. Remove it, or put it back.">
              Missing
            </span>
          ) : (
            <span className="folder-count">
              {count} project{count === 1 ? '' : 's'}
            </span>
          )}
        </button>
      )}
      <div className="folder-actions">
        <button type="button" className="btn small" disabled={folder.missing} onClick={onNewHere}>
          New project here
        </button>
        <button type="button" className="btn small" disabled={folder.missing} onClick={onOpenHere}>
          Open folder here…
        </button>
        {folder.default ? (
          <button type="button" className="btn small" aria-label="Change the default folder" data-tip="New projects go here when you pick no location." onClick={onChangeDefault} disabled={changing}>
            Change…
          </button>
        ) : (
          <>
            <button ref={renameRef} type="button" className="icon-btn small" aria-label={`Rename ${folder.label}`} data-tip="Rename" onClick={() => setEditing(true)} disabled={editing}>
              <Icon name="pencil" size={14} />
            </button>
            <button type="button" className="icon-btn small" aria-label={`Remove ${folder.label} from the list`} data-tip="Remove from list. Files stay on disk." onClick={onRemove}>
              <Icon name="close" size={14} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

interface FoldersSectionProps {
  list: WorkspaceList | null;
  projects: Project[] | null;
  filterId: string | null;
  chooser: FolderChooser;
  onFilter: (id: string | null) => void;
  onAdd: (path: string) => Promise<WorkspaceFolder | null>;
  onRename: (id: string, label: string) => Promise<boolean>;
  onRemove: (folder: WorkspaceFolder) => void;
  onNewHere: (folder: WorkspaceFolder) => void;
  onOpenHere: (folder: WorkspaceFolder) => void;
  onSetDefault: (path: string) => Promise<boolean>;
}

export function FoldersSection({ list, projects, filterId, chooser, onFilter, onAdd, onRename, onRemove, onNewHere, onOpenHere, onSetDefault }: FoldersSectionProps) {
  const [pasting, setPasting] = useState(false);
  const [pastingDefault, setPastingDefault] = useState(false);
  const folders = list?.folders ?? [];
  const homeDir = list?.homeDir ?? null;
  const changeDefault = async (current: WorkspaceFolder) => {
    if (chooser.unsupported) {
      setPastingDefault(true);
      return;
    }
    const picked = await chooser.choose('Choose the default folder for new projects', current.path);
    if (picked.path) await onSetDefault(picked.path);
    else if (picked.unsupported) setPastingDefault(true);
  };
  const add = async () => {
    if (chooser.unsupported) {
      setPasting(true);
      return;
    }
    const picked = await chooser.choose('Choose a folder you work in');
    if (picked.path) await onAdd(picked.path);
    else if (picked.unsupported) setPasting(true);
  };
  return (
    <section className="home-list home-folders" aria-labelledby="folders-heading">
      <div className="home-list-head">
        <h2 id="folders-heading">Folders</h2>
        {folders.length > 0 && <span className="count">{folders.length}</span>}
        <div className="spacer" />
        <button type="button" className="btn small has-icon" onClick={() => void add()} disabled={chooser.picking}>
          <Icon name="plus" size={14} />
          Add folder…
        </button>
      </div>
      {pasting && (
        <PastePath
          label="Folder to add"
          action="Add"
          onSubmit={(path) =>
            void onAdd(path).then((saved) => {
              if (saved) setPasting(false);
            })
          }
        />
      )}
      {pastingDefault && (
        <PastePath
          label="Default folder for new projects"
          action="Use as default"
          onSubmit={(path) =>
            void onSetDefault(path).then((ok) => {
              if (ok) setPastingDefault(false);
            })
          }
        />
      )}
      {folders.length > 0 && (
        <ul className="folder-list">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              count={projectsInFolder(projects ?? [], folder.path).length}
              active={filterId === folder.id}
              homeDir={homeDir}
              onFilter={() => onFilter(filterId === folder.id ? null : folder.id)}
              onNewHere={() => onNewHere(folder)}
              onOpenHere={() => onOpenHere(folder)}
              onRename={(label) => onRename(folder.id, label)}
              onRemove={() => onRemove(folder)}
              onChangeDefault={() => void changeDefault(folder)}
              changing={chooser.picking}
            />
          ))}
        </ul>
      )}
      {list !== null && folders.every((folder) => folder.default) && !pasting && (
        <p className="home-folders-empty">Add the other folders you work in. Then you can make new projects there and see which projects each one holds.</p>
      )}
    </section>
  );
}
