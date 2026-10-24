import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { formatAnswers, needsQuestions } from '../../shared/clarify';
import { DEFAULT_SETTINGS, type ClarifyQuestion, type Project, type ProjectKind, type ProjectSettings, type Starter } from '../../shared/contracts';
import { shortenHome, type WorkspaceFolder } from '../../shared/folders';
import { api, errorText } from '../api';
import { findPack, pickable, usePacks } from '../packs';
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
import { ClarifyForm, ComposerChips, imageFiles, useComposerAttachments, type ImageDraft, type ReferenceDraft } from './HomeComposerParts';
import { FirstRunPanel, HomeToast, StarterGallery, useHomeProjects, useOnboarding, useProjectActions, type HomeToastState } from './HomeSections';

type Busy = 'create' | 'import' | 'ask' | null;


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

function PromptArea({ value, onChange, onSubmit, onPaste }: { value: string; onChange: (v: string) => void; onSubmit: (e: FormEvent) => void; onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void }) {
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
      onPaste={onPaste}
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

function CreateButton({ busy, disabled }: { busy: Busy; disabled: boolean }) {
  const working = busy === 'create' || busy === 'ask';
  const label = busy === 'create' ? 'Creating…' : busy === 'ask' ? 'Thinking…' : 'Create';
  return (
    <button className="btn primary has-icon" type="submit" disabled={disabled} title="Create (⌘↩)">
      {working ? <span className="spinner" /> : <Icon name="arrowUp" size={14} />}
      {label}
    </button>
  );
}

interface HomeCreateInput {
  prompt: string;
  kind: ProjectKind;
  settings: ProjectSettings;
  designMd: string;
  packId: string | null;
  designCount: number;
  location: string | null;
  images: ImageDraft[];
  references: ReferenceDraft[];
}

async function createFromHome(input: HomeCreateInput): Promise<Project> {
  const extra = { ...(input.designMd.trim() ? { designMd: input.designMd } : {}), ...(input.packId ? { packId: input.packId } : {}) };
  const fanOut = input.designCount > 1;
  const level = input.settings.defaultLevel;
  const where = input.location ? { parentPath: input.location } : {};
  const referenceUrls = input.references.map((reference) => reference.url);
  const refs = referenceUrls.length > 0 ? { referenceUrls } : {};
  const separateRun = !fanOut && input.images.length > 0;
  const { project } = await api.createProject({ prompt: input.prompt, kind: input.kind, settings: input.settings, level, ...extra, ...where, ...(fanOut || separateRun ? { startRun: false } : {}), ...refs });
  if (fanOut) homeVariations.set({ projectId: project.id, prompt: input.prompt, count: input.designCount, level });
  const main = project.directions.find((direction) => direction.id === 'main') ?? project.directions[0];
  if (separateRun && main) {
    const uploaded = await Promise.all(input.images.map((image) => api.uploadAttachment(project.id, image.file)));
    await api.startRun(project.id, main.id, { prompt: input.prompt, mode: 'edit', level, attachmentIds: uploaded.map((item) => item.id), ...refs });
  }
  return project;
}

export function Home({ onOpen }: { onOpen: (projectId: string) => void }) {
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
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<HomeToastState | null>(null);
  const onboarding = useOnboarding();
  const { projects, setProjects, listError, loadProjects, searchRef } = useHomeProjects();
  const { images, references, dragging, fileRef, addImages, removeImage, removeReference, onPromptPaste, dropHandlers } = useComposerAttachments(setFormError);
  const showToast = useCallback((next: Omit<HomeToastState, 'id'>) => setToast({ ...next, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);


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

  const build = async (finalPrompt: string) => {
    const parsed = parseDraft(settingsDraft);
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }
    setBusy('create');
    setFormError(null);
    try {
      const project = await createFromHome({ prompt: finalPrompt, kind, settings: parsed.settings, designMd, packId: pack?.id ?? null, designCount, location, images, references });
      onOpen(project.id);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || busy !== null) return;
    if (questions !== null) {
      document.querySelector<HTMLFormElement>('form.clarify')?.requestSubmit();
      return;
    }
    if (needsQuestions(text)) {
      setBusy('ask');
      setFormError(null);
      const asked = await api.clarify(text).catch(() => ({ questions: [] as ClarifyQuestion[] }));
      setBusy(null);
      if (asked.questions.length > 0) {
        setQuestions(asked.questions);
        return;
      }
    }
    await build(text);
  };

  const openStarter = async (starter: Starter) => {
    const { project } = await api.createFromStarter(starter.id, location ?? undefined);
    onOpen(project.id);
  };

  const openSample = async () => {
    const { project } = await api.createSample(location ?? undefined);
    onOpen(project.id);
  };

  const actions = useProjectActions({ onOpen, setProjects, loadProjects, showToast });

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
        <nav className="home-nav" aria-label="Library">
          <button type="button" className="btn ghost small has-icon" onClick={() => uiStore.set({ screen: 'design-systems', libraryFrom: null })}>
            <Icon name="palette" size={14} />
            Design systems
          </button>
        </nav>
      </header>
      <main className="home-main">
        <section className="home-hero">
          <h1>Start a new project</h1>
          <p className="home-lede">Describe a page. The agent builds it, and every change becomes a version you can compare, branch or restore.</p>
          <form
            className={`home-composer${dragging ? ' dragging' : ''}`}
            onSubmit={create}
            {...dropHandlers}
          >
            <ComposerChips images={images} references={references} onRemoveImage={removeImage} onRemoveReference={removeReference} />
            <PromptArea value={prompt} onChange={setPrompt} onSubmit={create} onPaste={onPromptPaste} />
            {dragging && (
              <div className="home-drop-hint" aria-hidden="true">
                <Icon name="image" size={16} />
                Drop an image or a link to use it as a reference
              </div>
            )}
            <div className="home-composer-bar">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                hidden
                onChange={(event) => {
                  addImages(imageFiles(event.target.files));
                  event.target.value = '';
                }}
              />
              <button type="button" className="icon-btn" aria-label="Attach images" title="Attach images (or drop or paste them)" onClick={() => fileRef.current?.click()}>
                <Icon name="paperclip" size={16} />
              </button>
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
              <PackPicker state={pickable(packs)} value={pack?.id ?? null} onChange={(id) => uiStore.set({ lastPackId: id })} onNew={() => uiStore.set({ screen: 'new-design-system', returnTo: 'home' })} />
              <div className="spacer" />
              <CreateButton busy={busy} disabled={busy !== null || !prompt.trim() || questions !== null} />
            </div>
          </form>
          {questions && (
            <ClarifyForm
              questions={questions}
              busy={busy === 'create'}
              onBuild={(answers) => void build(formatAnswers(prompt, answers))}
              onSkip={() => void build(prompt.trim())}
              onCancel={() => {
                setQuestions(null);
                focusPrompt(homeRef.current);
              }}
            />
          )}
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
        {onboarding.show && <FirstRunPanel onClose={onboarding.dismiss} onSample={openSample} />}
        {projects !== null && projects.length === 0 && <StarterGallery disabled={busy !== null} onPick={openStarter} />}
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
          actions={actions}
          query={query}
          onQuery={setQuery}
          searchRef={searchRef}
          filter={filterFolder ? { label: filterFolder.label, onClear: () => setFolderFilter(null) } : null}
        />
        {projects !== null && projects.length > 0 && <StarterGallery disabled={busy !== null} onPick={openStarter} />}
      </main>
      <HomeToast toast={toast} onDone={clearToast} />
    </div>
  );
}
