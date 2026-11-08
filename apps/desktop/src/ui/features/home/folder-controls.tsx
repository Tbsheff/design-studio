import type { Project } from "@design-studio/contracts";
import {
  nameFromPrompt,
  projectsInFolder,
  shortenHome,
  slugify,
} from "@design-studio/contracts/folders";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";
import { Icon, LazySelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { copy } from "./copy.js";
import type { FolderChooser } from "./use-folder-chooser.js";

const FolderPath = ({
  path,
  homeDir,
}: {
  readonly path: string;
  readonly homeDir: string | null;
}): ReactElement => {
  const short = shortenHome(path, homeDir);
  const cut = short.lastIndexOf("/");
  const head = cut > 0 ? short.slice(0, cut + 1) : "";
  const tail = cut > 0 ? short.slice(cut + 1) : short;
  return (
    <span className="folder-path" data-tip={path}>
      {head && <span className="folder-path-head">{head}</span>}
      <span className="folder-path-tail">{tail}</span>
    </span>
  );
};

const PastePath = ({
  label,
  action,
  onSubmit,
}: {
  readonly label: string;
  readonly action: string;
  readonly onSubmit: (path: string) => void;
}): ReactElement => {
  const [value, setValue] = useState("");
  return (
    <form
      className="paste-path"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value.trim());
        }
      }}
    >
      <input
        aria-label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={copy.usersMeProjects}
        spellCheck={false}
        autoFocus
      />
      <button className="btn small" type="submit" disabled={!value.trim()}>
        {action}
      </button>
    </form>
  );
};

const DEFAULT = "default";
const CHOOSE = "choose";

function locationOptions(
  usable: WorkspaceFolder[],
  value: string | null,
  homeDir: string | null,
  labels: { readonly fallback: string; readonly isUnsupported: boolean }
): UiSelectOption[] {
  const custom =
    value && !usable.some((folder) => folder.path === value)
      ? [{ label: shortenHome(value, homeDir), value }]
      : [];
  return [
    { label: labels.fallback, value: DEFAULT },
    ...usable.map((folder) => ({ label: folder.label, value: folder.path })),
    ...custom,
    {
      label: labels.isUnsupported ? "Paste a folder path…" : "Choose folder…",
      value: CHOOSE,
    },
  ];
}

interface LocationProps {
  readonly folders: WorkspaceFolder[];
  readonly value: string | null;
  readonly homeDir: string | null;
  readonly prompt: string;
  readonly chooser: FolderChooser;
  readonly onChange: (path: string | null) => void;
  readonly onAddFolder: (path: string) => Promise<WorkspaceFolder | null>;
}

const LocationField = ({
  folders,
  value,
  homeDir,
  prompt,
  chooser,
  onChange,
  onAddFolder,
}: LocationProps): ReactElement => {
  const [pasting, setPasting] = useState(false);
  const fallback = folders.find((folder) => folder.default) ?? null;
  const usable = folders.filter((folder) => !folder.missing && !folder.default);
  const parent = value ?? fallback?.path ?? null;
  const target = parent ? `${parent}/${slugify(nameFromPrompt(prompt))}` : null;
  const useFolder = async (path: string): Promise<void> => {
    const saved = await onAddFolder(path);
    if (saved) {
      setPasting(false);
      onChange(saved.path);
    }
  };
  const pick = async (): Promise<void> => {
    if (chooser.isUnsupported) {
      setPasting(true);
      return;
    }
    const picked = await chooser.choose(
      "Choose where to save the new project",
      value ?? undefined
    );
    if (picked.path) {
      await useFolder(picked.path);
    } else if (picked.isUnsupported) {
      setPasting(true);
    }
  };
  return (
    <div className="home-location">
      <label htmlFor="new-project-location">Location</label>
      <LazySelect
        id="new-project-location"
        value={value ?? DEFAULT}
        disabled={chooser.isPicking}
        options={locationOptions(usable, value, homeDir, {
          fallback: fallback?.label ?? "Design Studio",
          isUnsupported: chooser.isUnsupported,
        })}
        onChange={(next) => {
          if (next === CHOOSE) {
            void pick();
          } else {
            setPasting(false);
            onChange(next === DEFAULT ? null : next);
          }
        }}
      />
      {pasting ? (
        <PastePath
          label="Folder for the new project"
          action="Use folder"
          onSubmit={(path) => useFolder(path)}
        />
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
};

interface FolderRowProps {
  readonly folder: WorkspaceFolder;
  readonly count: number;
  readonly isActive: boolean;
  readonly homeDir: string | null;
  readonly onFilter: () => void;
  readonly onNewHere: () => void;
  readonly onOpenHere: () => void;
  readonly onRename: (label: string) => Promise<boolean>;
  readonly onRemove: () => void;
  readonly onChangeDefault: () => void;
  readonly isChanging: boolean;
}

const FolderRow = ({
  folder,
  count,
  isActive,
  homeDir,
  onFilter,
  onNewHere,
  onOpenHere,
  onRename,
  onRemove,
  onChangeDefault,
  isChanging,
}: FolderRowProps): ReactElement => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(folder.label);
  const renameRef = useRef<HTMLButtonElement>(null);
  const stopEditing = (): void => {
    setEditing(false);
    window.requestAnimationFrame(() => renameRef.current?.focus());
  };
  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const next = label.trim();
    if (!next || next === folder.label) {
      setLabel(folder.label);
      stopEditing();
      return;
    }
    if (await onRename(next)) {
      stopEditing();
    }
  };
  return (
    <li
      className={`folder-row${folder.missing ? " missing" : ""}${isActive ? " active" : ""}`}
    >
      {editing ? (
        <form className="folder-rename" onSubmit={(e) => save(e)}>
          <input
            aria-label={`Name for ${folder.label}`}
            value={label}
            maxLength={80}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
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
        <button
          type="button"
          className="folder-main"
          aria-pressed={isActive}
          onClick={onFilter}
          data-tip={
            isActive ? "Show all projects" : `Show projects in ${folder.label}`
          }
          data-tip-align="start"
        >
          <Icon name="folder" size={16} />
          <span className="folder-text">
            <span className="folder-label">
              {folder.label}
              {folder.default && (
                <span className="badge folder-default">Default</span>
              )}
            </span>
            <FolderPath path={folder.path} homeDir={homeDir} />
          </span>
          {folder.missing ? (
            <span className="badge fail" data-tip={copy.thisFolderWasMovedOr}>
              Missing
            </span>
          ) : (
            <span className="folder-count">
              {count} project{count === 1 ? "" : "s"}
            </span>
          )}
        </button>
      )}
      <div className="folder-actions">
        <button
          type="button"
          className="btn small"
          disabled={folder.missing}
          onClick={onNewHere}
        >
          New project here
        </button>
        <button
          type="button"
          className="btn small"
          disabled={folder.missing}
          onClick={onOpenHere}
        >
          Open folder here…
        </button>
        <span className="folder-tail">
          {folder.default ? (
            <button
              type="button"
              className="btn small"
              aria-label={copy.changeTheDefaultFolder}
              data-tip={copy.newProjectsGoHereWhen}
              onClick={onChangeDefault}
              disabled={isChanging}
            >
              Change…
            </button>
          ) : (
            <>
              <button
                ref={renameRef}
                type="button"
                className="icon-btn small"
                aria-label={`Rename ${folder.label}`}
                data-tip={copy.rename}
                onClick={() => setEditing(true)}
                disabled={editing}
              >
                <Icon name="pencil" size={14} />
              </button>
              <button
                type="button"
                className="icon-btn small"
                aria-label={`Remove ${folder.label} from the list`}
                data-tip={copy.removeFromListFilesStay}
                onClick={onRemove}
              >
                <Icon name="close" size={14} />
              </button>
            </>
          )}
        </span>
      </div>
    </li>
  );
};

interface FoldersSectionProps {
  readonly list: WorkspaceList | null;
  readonly projects: Project[] | null;
  readonly filterId: string | null;
  readonly chooser: FolderChooser;
  readonly onFilter: (id: string | null) => void;
  readonly onAdd: (path: string) => Promise<WorkspaceFolder | null>;
  readonly onRename: (id: string, label: string) => Promise<boolean>;
  readonly onRemove: (folder: WorkspaceFolder) => void;
  readonly onNewHere: (folder: WorkspaceFolder) => void;
  readonly onOpenHere: (folder: WorkspaceFolder) => void;
  readonly onSetDefault: (path: string) => Promise<boolean>;
}

const FoldersSection = ({
  list,
  projects,
  filterId,
  chooser,
  onFilter,
  onAdd,
  onRename,
  onRemove,
  onNewHere,
  onOpenHere,
  onSetDefault,
}: FoldersSectionProps): ReactElement => {
  const [pasting, setPasting] = useState(false);
  const [pastingDefault, setPastingDefault] = useState(false);
  const folders = list?.folders ?? [];
  const homeDir = list?.homeDir ?? null;
  const changeDefault = async (current: WorkspaceFolder): Promise<void> => {
    if (chooser.isUnsupported) {
      setPastingDefault(true);
      return;
    }
    const picked = await chooser.choose(
      "Choose the default folder for new projects",
      current.path
    );
    if (picked.path) {
      await onSetDefault(picked.path);
    } else if (picked.isUnsupported) {
      setPastingDefault(true);
    }
  };
  const add = async (): Promise<void> => {
    if (chooser.isUnsupported) {
      setPasting(true);
      return;
    }
    const picked = await chooser.choose("Choose a folder you work in");
    if (picked.path) {
      await onAdd(picked.path);
    } else if (picked.isUnsupported) {
      setPasting(true);
    }
  };
  return (
    <section
      className="home-list home-folders"
      aria-labelledby="folders-heading"
    >
      <div className="home-list-head">
        <h2 id="folders-heading">Folders</h2>
        {folders.length > 0 && <span className="count">{folders.length}</span>}
        <div className="spacer" />
        <button
          type="button"
          className="btn small has-icon"
          onClick={() => add()}
          disabled={chooser.isPicking}
        >
          <Icon name="plus" size={14} />
          Add folder…
        </button>
      </div>
      {pasting && (
        <PastePath
          label="Folder to add"
          action="Add"
          onSubmit={(path) =>
            onAdd(path).then((saved) => {
              if (saved) {
                setPasting(false);
              }
            })
          }
        />
      )}
      {pastingDefault && (
        <PastePath
          label="Default folder for new projects"
          action="Use as default"
          onSubmit={(path) =>
            onSetDefault(path).then((ok) => {
              if (ok) {
                setPastingDefault(false);
              }
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
              isActive={filterId === folder.id}
              homeDir={homeDir}
              onFilter={() =>
                onFilter(filterId === folder.id ? null : folder.id)
              }
              onNewHere={() => onNewHere(folder)}
              onOpenHere={() => onOpenHere(folder)}
              onRename={(label) => onRename(folder.id, label)}
              onRemove={() => onRemove(folder)}
              onChangeDefault={() => changeDefault(folder)}
              isChanging={chooser.isPicking}
            />
          ))}
        </ul>
      )}
      {list !== null &&
        folders.every((folder) => folder.default) &&
        !pasting && (
          <p className="home-folders-empty">
            Add the other folders you work in. Then you can make new projects
            there and see which projects each one holds.
          </p>
        )}
    </section>
  );
};

export { FoldersSection, LocationField };
