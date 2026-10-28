import { useRef, useState, type FormEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { nameFromPrompt, projectsInFolder, shortenHome, slugify, type WorkspaceFolder, type WorkspaceList } from '../../shared/folders';
import type { FolderChooser } from '../useFolderChooser';
import { Icon } from './Icon';
import { LazySelect } from './LazySelect';
import type { UiSelectOption } from './UiSelect';

function FolderPath({ path, homeDir }: { path: string; homeDir: string | null }) {
  const short = shortenHome(path, homeDir);
  const cut = short.lastIndexOf('/');
  const head = cut > 0 ? short.slice(0, cut + 1) : '';
  const tail = cut > 0 ? short.slice(cut + 1) : short;
  return (
    <span className="folder-path" data-tip={path}>
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

const DEFAULT = 'default';
const CHOOSE = 'choose';

function locationOptions(usable: WorkspaceFolder[], value: string | null, fallback: string, homeDir: string | null, unsupported: boolean): UiSelectOption[] {
  const custom = value && !usable.some((folder) => folder.path === value) ? [{ value, label: shortenHome(value, homeDir) }] : [];
  return [
    { value: DEFAULT, label: fallback },
    ...usable.map((folder) => ({ value: folder.path, label: folder.label })),
    ...custom,
    { value: CHOOSE, label: unsupported ? 'Paste a folder path…' : 'Choose folder…' },
  ];
}

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
      <LazySelect
        id="new-project-location"
        value={value ?? DEFAULT}
        disabled={chooser.picking}
        options={locationOptions(usable, value, fallback?.label ?? 'Design Studio', homeDir, chooser.unsupported)}
        onChange={(next) => {
          if (next === CHOOSE) void pick();
          else {
            setPasting(false);
            onChange(next === DEFAULT ? null : next);
          }
        }}
      />
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
        <button type="button" className="folder-main" aria-pressed={active} onClick={onFilter} data-tip={active ? 'Show all projects' : `Show projects in ${folder.label}`} data-tip-align="start">
          <Icon name="folder" size={16} />
          <span className="folder-text">
            <span className="folder-label">
              {folder.label}
              {folder.default && <span className="badge folder-default">Default</span>}
            </span>
            <FolderPath path={folder.path} homeDir={homeDir} />
          </span>
          {folder.missing ? (
            <span className="badge fail" data-tip="This folder was moved or deleted. Remove it, or put it back.">
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
        <span className="folder-tail">
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
        </span>
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
