import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { DEFAULT_SETTINGS, type Project, type ProjectKind } from '../../shared/contracts';
import { shortenHome, type WorkspaceFolder } from '../../shared/folders';
import { api, errorText } from '../api';
import { findPack, usePacks } from '../packs';
import { homeVariations, uiStore, useUi } from '../storage';
import { maxVariationsFor } from '../variationsApi';
import { Disclosure } from './Disclosure';
import { FoldersSection, LocationField, OpenFolder, useFolderChooser } from './FolderControls';
import { filterByFolder, locationFor, useWorkspaces } from '../useWorkspaces';
import { Icon } from './Icon';
import { useRovingRadioGroup } from './LevelControl';
import { NewProjectAdvanced } from './NewProjectAdvanced';
import { PackPicker } from './PackPicker';
import { RunSettings } from './RunSettings';
import { ProjectGrid } from './ProjectGrid';
import { parseDraft, toDraft } from './SettingsFields';
import { BrandMark } from './StudioTopbar';

type Busy = 'create' | 'import' | null;

const KINDS = ['html', 'react'] as const;

function KindToggle({ kind, onKind }: { kind: ProjectKind; onKind: (k: ProjectKind) => void }) {
  const radios = useRovingRadioGroup(KINDS, kind, onKind);
  return (
    <div className="segmented" role="radiogroup" aria-label="Project kind" onKeyDown={radios.onKeyDown}>
      {KINDS.map((k) => (
        <button key={k} {...radios.item(k)} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => onKind(k)}>
          <Icon name={k === 'html' ? 'code' : 'react'} size={14} />
          {k === 'html' ? 'HTML' : 'React + Vite'}
        </button>
      ))}
    </div>
  );
}

function PromptArea({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: (e: FormEvent) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(320, el.scrollHeight)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label="Describe the design"
      rows={3}
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(e);
      }}
      placeholder="A pricing page for a developer tool with three tiers"
    />
  );
}

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
      <span>
        {hidden.count === 1 ? "1 project is in the app's hidden folder" : `${hidden.count} projects are in the app's hidden folder`}
      </span>
      <button type="button" className="btn small" onClick={() => void move()} disabled={moving}>
        {moving ? 'Moving…' : `Move to ${shortenHome(hidden.target, homeDir)}`}
      </button>
      {error && <span className="home-hidden-error">{error}</span>}
    </div>
  );
}

function focusPrompt(home: HTMLElement | null): void {
  home?.scrollTo({ top: 0, behavior: 'smooth' });
  window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[aria-label="Describe the design"]')?.focus());
}

function focusOpenFolder(): void {
  window.requestAnimationFrame(() => {
    const row = document.querySelector<HTMLFormElement>('form.open-folder');
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  });
}

export function Home({ onOpen }: { onOpen: (projectId: string) => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<ProjectKind>('html');
  const [busy, setBusy] = useState<Busy>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState(() => toDraft(DEFAULT_SETTINGS));
  const [designMd, setDesignMd] = useState('');
  const [designs, setDesigns] = useState(1);
  const maxDesigns = maxVariationsFor(kind);
  const designCount = Math.min(designs, maxDesigns);
  const packs = usePacks();
  const { lastPackId, lastLocation } = useUi();
  const pack = findPack(packs.packs, lastPackId);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [importPath, setImportPath] = useState('');
  const chooser = useFolderChooser(setFormError);
  const homeRef = useRef<HTMLDivElement>(null);
  const { workspaces, addFolder, renameFolder, forgetFolder, setDefaultFolder } = useWorkspaces(setFormError);
  const homeDir = workspaces ? workspaces.homeDir : null;

  const loadProjects = () =>
    api
      .listProjects()
      .then((list) => setProjects([...list].sort((a, b) => b.updatedAt - a.updatedAt)))
      .catch((err) => setListError(errorText(err)));

  useEffect(() => {
    void loadProjects();
  }, []);

  const location = locationFor(workspaces, lastLocation);
  const setLocation = (path: string | null) => uiStore.set({ lastLocation: path });

  const removeFolder = async (target: WorkspaceFolder) => {
    if (!(await forgetFolder(target))) return;
    if (folderFilter === target.id) setFolderFilter(null);
    if (lastLocation === target.path) setLocation(null);
  };

  const newProjectHere = (folder: WorkspaceFolder) => {
    setLocation(folder.default ? null : folder.path);
    focusPrompt(homeRef.current);
  };

  const openFolderHere = async (folder: WorkspaceFolder) => {
    const picked = await chooser.choose(`Choose a folder in ${folder.label} to open`, folder.path);
    if (!picked.path) return;
    setImportPath(picked.path);
    focusOpenFolder();
  };

  const { filterFolder, shownProjects } = filterByFolder(projects, workspaces, folderFilter);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const parsed = parseDraft(settingsDraft);
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }
    setBusy('create');
    setFormError(null);
    try {
      const extra = { ...(designMd.trim() ? { designMd } : {}), ...(pack ? { packId: pack.id } : {}) };
      const fanOut = designCount > 1;
      const level = parsed.settings.defaultLevel;
      const where = location ? { parentPath: location } : {};
      const { project } = await api.createProject({ prompt: prompt.trim(), kind, settings: parsed.settings, level, ...extra, ...where, ...(fanOut ? { startRun: false } : {}) });
      if (fanOut) homeVariations.set({ projectId: project.id, prompt: prompt.trim(), count: designCount, level });
      onOpen(project.id);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const importFolder = async (path: string) => {
    setBusy('import');
    setFormError(null);
    try {
      const { project } = await api.importProject(path);
      onOpen(project.id);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  return (
    <div className="home" ref={homeRef}>
      <header className="home-header">
        <BrandMark />
        <span className="brand">Design Studio</span>
      </header>
      <main className="home-main">
        <section className="home-hero">
          <h1>Start a new project</h1>
          <p className="home-lede">Describe a page. The agent builds it, and every change becomes a version you can compare, branch or restore.</p>
          <form className="home-composer" onSubmit={create}>
            <PromptArea value={prompt} onChange={setPrompt} onSubmit={create} />
            <div className="home-composer-bar">
              <KindToggle
                kind={kind}
                onKind={(next) => {
                  setKind(next);
                  setDesigns((n) => Math.min(n, maxVariationsFor(next)));
                }}
              />
              <RunSettings
                level={settingsDraft.defaultLevel}
                onLevel={(defaultLevel) => setSettingsDraft((d) => ({ ...d, defaultLevel }))}
                designs={{ value: designCount, max: maxDesigns, onChange: setDesigns, disabledReason: null }}
              />
              <PackPicker state={packs} value={pack?.id ?? null} onChange={(id) => uiStore.set({ lastPackId: id })} />
              <div className="spacer" />
              <button className="btn primary has-icon" type="submit" disabled={busy !== null || !prompt.trim()}>
                {busy === 'create' ? <span className="spinner" /> : <Icon name="arrowUp" size={14} />}
                {busy === 'create' ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
          <LocationField
            folders={workspaces?.folders ?? []}
            value={location}
            homeDir={homeDir}
            prompt={prompt}
            chooser={chooser}
            onChange={setLocation}
            onAddFolder={addFolder}
          />
          <NewProjectAdvanced
            draft={settingsDraft}
            onDraft={setSettingsDraft}
            designMd={designMd}
            onDesignMd={setDesignMd}
            onError={setFormError}
          />
          {formError && (
            <div className="alert error" role="alert">
              {formError}
            </div>
          )}
          <Disclosure className="home-disclosure" />
          <OpenFolder busy={busy !== null} path={importPath} homeDir={homeDir} chooser={chooser} onPath={setImportPath} onImport={(p) => void importFolder(p)} />
        </section>
        <HiddenProjectsNote homeDir={homeDir} onMoved={() => void loadProjects()} />
        <FoldersSection
          list={workspaces}
          projects={projects}
          filterId={folderFilter}
          chooser={chooser}
          onFilter={setFolderFilter}
          onAdd={addFolder}
          onRename={renameFolder}
          onRemove={(folder) => void removeFolder(folder)}
          onNewHere={newProjectHere}
          onOpenHere={(folder) => void openFolderHere(folder)}
          onSetDefault={setDefaultFolder}
        />
        <ProjectGrid
          projects={shownProjects}
          packs={packs.packs}
          error={listError}
          onOpen={onOpen}
          filter={filterFolder ? { label: filterFolder.label, onClear: () => setFolderFilter(null) } : null}
        />
      </main>
    </div>
  );
}
