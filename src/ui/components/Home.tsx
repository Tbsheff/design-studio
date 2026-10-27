import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { formatAnswers, needsQuestions } from '../../shared/clarify';
import { DEFAULT_SETTINGS, type ClarifyQuestion, type PackSummary, type Project, type ProjectKind, type ProjectSettings, type RunLevel, type Starter } from '../../shared/contracts';
import type { WorkspaceFolder, WorkspaceList } from '../../shared/folders';
import { api, errorText } from '../api';
import { findPack, pickable, usePacks, type PacksState } from '../packs';
import { homeVariations, uiStore, useUi } from '../storage';
import { maxVariationsFor } from '../variationsApi';
import { filterByFolder, locationFor, useWorkspaces } from '../useWorkspaces';
import { useFolderChooser } from '../useFolderChooser';
import { homePrefs, useHomePrefs, type HomeTab } from '../homePrefs';
import { Icon } from './Icon';
import { usePresence } from '../usePresence';
import { ThemeButton } from './ThemeButton';
import { ProjectGrid } from './ProjectGrid';
import { reportAppStart } from '../perfTelemetry';
import { prefetchScreensWhenIdle } from '../screens';
import { MODEL_OPTIONS, modelLabel, parseDraft, toDraft } from '../settingsDraft';
import { StableText } from './StableText';
import { BrandMark } from './BrandMark';
import { ComposerAlert, ComposerChips, useComposerAttachments, type ImageDraft, type ReferenceDraft } from './HomeComposerParts';
import { HomeToast, useHomeProjects, useOnboarding, useProjectActions, type HomeToastState } from './HomeSections';
import type { HomeTemplate } from './HomeTemplates';
import type { ModelSettings, PlusMenuActions } from './HomePopovers';

const startersChunk = import('./HomeStarters');
const StarterGallery = lazy(() => startersChunk.then((m) => ({ default: m.StarterGallery })));
const FirstRunPanel = lazy(() => startersChunk.then((m) => ({ default: m.FirstRunPanel })));
const clarifyChunk = import('./ClarifyForm');
const ClarifyForm = lazy(() => clarifyChunk.then((m) => ({ default: m.ClarifyForm })));
const loadTrash = () => import('./HomeTrash');
const loadSlash = () => import('./HomeSlash');
const HomeTrash = lazy(loadTrash);
const loadPops = () => import('./HomePopovers');
const PlusMenu = lazy(() => loadPops().then((m) => ({ default: m.PlusMenu })));
const PackPopover = lazy(() => loadPops().then((m) => ({ default: m.PackPopover })));
const ModelPopover = lazy(() => loadPops().then((m) => ({ default: m.ModelPopover })));
const LevelPopover = lazy(() => loadPops().then((m) => ({ default: m.LevelPopover })));
const PackCards = lazy(() => loadPops().then((m) => ({ default: m.PackCards })));
const loadTemplates = () => import('./HomeTemplates');
const loadExtras = () => import('./HomeExtras');
const FoldersSection = lazy(() => loadExtras().then((m) => ({ default: m.FoldersSection })));

type Busy = 'create' | 'import' | 'ask' | 'starter' | null;
type Pop = 'plus' | 'pack' | 'level' | 'model' | null;

const EXAMPLES = ['Wireframe a settings page', 'Prototype a dashboard for tracking orders', 'A pricing page for a developer tool with three tiers', 'Turn my notes into a one-page brief', 'A mobile onboarding flow for a running app'];
const EXAMPLE_MS = 3500;
const LEVEL_LABEL: Record<RunLevel, string> = {
  wireframe: 'Wireframe',
  prototype: 'Prototype',
  polish: 'Polish',
};
const TABS: { id: HomeTab; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'systems', label: 'Design systems' },
  { id: 'templates', label: 'Templates' },
];

function useModule<T>(load: () => Promise<T>, enabled: boolean): T | null {
  const [mod, setMod] = useState<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void load().then((loaded) => live && setMod(loaded));
    return () => {
      live = false;
    };
  }, [enabled, load]);
  return mod;
}

function useExample(paused: boolean): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setIndex((n) => (n + 1) % EXAMPLES.length), EXAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [paused]);
  return EXAMPLES[index] ?? '';
}

interface PromptAreaProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  describedBy?: string | undefined;
  menuKeys: { current: ((e: KeyboardEvent<HTMLTextAreaElement>) => boolean) | null };
}

function PromptArea({ value, onChange, onSubmit, onPaste, describedBy, menuKeys }: PromptAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const example = useExample(value !== '');
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
      aria-describedby={describedBy}
      rows={2}
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (menuKeys.current?.(e)) return;
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) onSubmit(e);
      }}
      placeholder={example}
    />
  );
}

function focusPrompt(home: HTMLElement | null, atEnd = false): void {
  home?.scrollTo({ top: 0, behavior: 'smooth' });
  window.requestAnimationFrame(() => {
    const area = document.querySelector<HTMLTextAreaElement>('[aria-label="Describe the design"]');
    area?.focus();
    if (atEnd && area) area.setSelectionRange(area.value.length, area.value.length);
  });
}

function focusOpenFolder(): void {
  window.setTimeout(() => {
    const row = document.querySelector<HTMLFormElement>('form.open-folder');
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.querySelector<HTMLButtonElement>('button[type="submit"], button')?.focus();
  }, 60);
}

function focusIn(selector: string): void {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus();
  }, 60);
}

const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const HOME_REASON_ID = 'home-send-reason';
const EMPTY_PROMPT = 'Describe the design first';

function SendButton({ busy, disabled, reason }: { busy: Busy; disabled: boolean; reason: string | null }) {
  const working = busy === 'create' || busy === 'ask';
  return (
    <button className="icon-btn send home-send" type="submit" disabled={disabled} aria-busy={working || undefined} aria-label={busy === 'ask' ? 'Thinking' : busy === 'create' ? 'Creating' : 'Create'} data-tip={disabled && reason ? reason : `Create  ${MOD_KEY}↩`} data-tip-align="end">
      <span key={working ? 'busy' : 'idle'} className="home-send-glyph">
        {working ? <span className="spinner" /> : <Icon name="arrowUp" size={16} />}
      </span>
      {reason && reason !== EMPTY_PROMPT && (
        <span id={HOME_REASON_ID} className="sr-only">
          {reason}
        </span>
      )}
    </button>
  );
}

function PillSelect({ label, value, sizes = [], open, triggerRef, onOpen, ariaLabel }: { label: string; value: string; sizes?: readonly string[]; open: boolean; triggerRef: RefObject<HTMLButtonElement | null>; onOpen: () => void; ariaLabel: string }) {
  return (
    <button ref={triggerRef} type="button" className="ui-pill-select" aria-haspopup="dialog" aria-expanded={open} aria-label={`${ariaLabel}: ${value}`} onPointerEnter={() => void loadPops()} onFocus={() => void loadPops()} onClick={onOpen}>
      <span className="ui-pill-select-label">{label}</span>
      <span className="ui-pill-select-value truncate">
        <StableText sizes={sizes}>{value}</StableText>
      </span>
      <svg className="ui-pill-select-caret" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path d={open ? 'M3.5 10L8 5.5l4.5 4.5' : 'M3.5 6L8 10.5 12.5 6'} />
      </svg>
    </button>
  );
}

function Tabs({ tab }: { tab: HomeTab }) {
  return (
    <div className="home-tabs" role="tablist" aria-label="Library">
      {TABS.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`home-tab${tab === item.id ? ' on' : ''}`} onClick={() => homePrefs.set({ tab: item.id })}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TabPanel({ tabs, actions, children }: { tabs: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="home-list" aria-label="Library">
      <div className="home-list-head">
        {tabs}
        <div className="spacer" />
        {actions}
      </div>
      {children}
    </section>
  );
}

function DropHint({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="home-drop-hint" aria-hidden="true">
      <Icon name="image" size={16} />
      Drop an image or a link to use it as a reference
    </div>
  );
}

function folderLabel(list: WorkspaceList | null, location: string | null): string {
  const folders = list?.folders ?? [];
  const match = folders.find((folder) => folder.path === location) ?? folders.find((folder) => folder.default);
  return match?.label ?? 'Design Studio';
}

function modelSummary(model: string, count: number): string {
  const extra = count > 1 ? ` · ${count}×` : '';
  return `${modelLabel(model).replace(/^Claude /, '')}${extra}`;
}

function StarterRow({ template, busy, onOpen }: { template: { label: string; starter: Starter | null } | null; busy: Busy; onOpen: (starter: Starter) => void }) {
  const starter = template?.starter;
  if (!template || !starter) return null;
  return (
    <div className="home-starter-row">
      <span className="ui-chip">{template.label} starter</span>
      <button type="button" className="link" disabled={busy !== null} onClick={() => onOpen(starter)}>
        {busy === 'starter' ? 'Opening…' : 'Open it now'}
      </button>
      <span className="home-starter-hint">No agent run, no cost</span>
    </div>
  );
}

type TemplatesModule = typeof import('./HomeTemplates');

function TemplatesSection({ open, templates, selected, disabled, onPick }: { open: boolean; templates: TemplatesModule | null; selected: string | null; disabled: boolean; onPick: (template: HomeTemplate, starter: Starter | null) => void }) {
  const grid = templates ? <templates.HomeTemplateGrid selected={selected} disabled={disabled} onPick={onPick} /> : <div className="home-tile-placeholder" aria-hidden="true" />;
  return (
    <section className="home-templates" aria-label="Choose a template">
      <button type="button" className="ui-section-label home-templates-toggle" aria-expanded={open} onClick={() => homePrefs.set({ templatesOpen: !open })}>
        Choose a template
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path d={open ? 'M3.5 10L8 5.5l4.5 4.5' : 'M3.5 6L8 10.5 12.5 6'} />
        </svg>
      </button>
      {open && grid}
    </section>
  );
}

function OtherTab({ tab, tabs, packs, pack, busy, onStarter, onPickPack }: { tab: HomeTab; tabs: ReactNode; packs: PacksState; pack: PackSummary | null; busy: Busy; onStarter: (starter: Starter) => Promise<void>; onPickPack: (id: string | null) => void }) {
  if (tab === 'templates') {
    return (
      <TabPanel tabs={tabs}>
        <Suspense fallback={null}>
          <StarterGallery disabled={busy !== null} onPick={onStarter} />
        </Suspense>
      </TabPanel>
    );
  }
  return (
    <TabPanel
      tabs={tabs}
      actions={
        <>
          <button type="button" className="btn small" onClick={() => uiStore.set({ screen: 'new-design-system', returnTo: 'home' })}>
            New design system
          </button>
          <button type="button" className="btn small" onClick={() => uiStore.set({ screen: 'design-systems', libraryFrom: null })}>
            Open library
          </button>
        </>
      }
    >
      <p className="home-section-hint">Pick one for your next project. Edit, import and export them in the library.</p>
      <Suspense fallback={null}>
        <PackCards packs={pickable(packs).packs ?? []} value={pack?.id ?? null} includeNone={false} onPick={(picked) => onPickPack(picked?.id ?? null)} />
      </Suspense>
    </TabPanel>
  );
}

interface ComposerBarProps {
  fileRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
  plusActions: Omit<PlusMenuActions, 'onDesignSystem'>;
  locationLabel: string;
  packs: PacksState;
  pack: PackSummary | null;
  kind: ProjectKind;
  onKind: (kind: ProjectKind) => void;
  modelValue: string;
  modelSizes: string[];
  modelSettings: ModelSettings;
  busy: Busy;
  sendDisabled: string | null;
}

function ComposerBar({ fileRef, onFiles, plusActions, locationLabel, packs, pack, kind, onKind, modelValue, modelSizes, modelSettings, busy, sendDisabled }: ComposerBarProps) {
  const [pop, setPop] = useState<Pop>(null);
  const shownPop = usePresence(pop);
  const plusRef = useRef<HTMLButtonElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const levelRef = useRef<HTMLButtonElement>(null);
  const closePop = useCallback(
    (refocus: boolean) => {
      const trigger = { plus: plusRef, pack: packRef, level: levelRef, model: modelRef }[pop ?? 'model'];
      setPop(null);
      if (refocus) trigger.current?.focus();
    },
    [pop],
  );
  const togglePop = (next: Exclude<Pop, null>) => setPop((current) => (current === next ? null : next));
  return (
    <div className="home-composer-bar">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <div className="home-anchor">
        <button
          ref={plusRef}
          type="button"
          className="icon-btn bordered home-square"
          aria-label="Add"
          aria-haspopup="menu"
          aria-expanded={pop === 'plus'}
          data-tip="Attach, import and options"
          data-tip-align="start"
          onPointerEnter={() => void loadPops()}
          onClick={() => togglePop('plus')}
        >
          <Icon name="plus" size={16} />
        </button>
        {shownPop.shown === 'plus' && (
          <Suspense fallback={null}>
            <PlusMenu trigger={plusRef} closing={shownPop.closing} onClose={closePop} locationLabel={locationLabel} actions={{ ...plusActions, onDesignSystem: () => setPop('pack') }} />
          </Suspense>
        )}
      </div>
      <div className="home-anchor">
        <PillSelect label="Design system" ariaLabel="Design system" value={pack?.name ?? 'None'} open={pop === 'pack'} triggerRef={packRef} onOpen={() => togglePop('pack')} />
        {shownPop.shown === 'pack' && (
          <Suspense fallback={null}>
            <PackPopover trigger={packRef} closing={shownPop.closing} onClose={closePop} state={pickable(packs)} value={pack?.id ?? null} onChange={(id) => uiStore.set({ lastPackId: id })} onNew={() => uiStore.set({ screen: 'new-design-system', returnTo: 'home' })} />
          </Suspense>
        )}
      </div>
      <button
        type="button"
        className="icon-btn bordered home-square home-kind"
        aria-pressed={kind === 'react'}
        aria-label="React + Vite project"
        data-tip={kind === 'react' ? 'React + Vite project. Press for a plain HTML page.' : 'Plain HTML page. Press for a React + Vite project.'}
        onClick={() => onKind(kind === 'react' ? 'html' : 'react')}
      >
        <Icon name="code" size={16} />
      </button>
      <div className="spacer" />
      <div className="home-anchor end">
        <PillSelect label="Level" ariaLabel="Level" value={LEVEL_LABEL[modelSettings.level]} sizes={Object.values(LEVEL_LABEL)} open={pop === 'level'} triggerRef={levelRef} onOpen={() => togglePop('level')} />
        {shownPop.shown === 'level' && (
          <Suspense fallback={null}>
            <LevelPopover trigger={levelRef} closing={shownPop.closing} onClose={closePop} level={modelSettings.level} onLevel={modelSettings.onLevel} />
          </Suspense>
        )}
      </div>
      <div className="home-anchor end">
        <PillSelect label="Model" ariaLabel="Model and run settings" value={modelValue} sizes={modelSizes} open={pop === 'model'} triggerRef={modelRef} onOpen={() => togglePop('model')} />
        {shownPop.shown === 'model' && (
          <Suspense fallback={null}>
            <ModelPopover trigger={modelRef} closing={shownPop.closing} onClose={closePop} settings={modelSettings} />
          </Suspense>
        )}
      </div>
      <SendButton busy={busy} disabled={sendDisabled !== null} reason={sendDisabled} />
    </div>
  );
}

function homeSendBlocker(busy: Busy, prompt: string, asking: boolean): string | null {
  if (busy !== null) return 'Working on it';
  if (asking) return 'Answer or skip the questions below';
  if (!prompt.trim()) return EMPTY_PROMPT;
  return null;
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
  const extra = {
    ...(input.designMd.trim() ? { designMd: input.designMd } : {}),
    ...(input.packId ? { packId: input.packId } : {}),
  };
  const fanOut = input.designCount > 1;
  const level = input.settings.defaultLevel;
  const where = input.location ? { parentPath: input.location } : {};
  const referenceUrls = input.references.map((reference) => reference.url);
  const refs = referenceUrls.length > 0 ? { referenceUrls } : {};
  const separateRun = !fanOut && input.images.length > 0;
  const { project } = await api.createProject({
    prompt: input.prompt,
    kind: input.kind,
    settings: input.settings,
    level,
    ...extra,
    ...where,
    ...(fanOut || separateRun ? { startRun: false } : {}),
    ...refs,
  });
  if (fanOut)
    homeVariations.set({
      projectId: project.id,
      prompt: input.prompt,
      count: input.designCount,
      level,
    });
  const main = project.directions.find((direction) => direction.id === 'main') ?? project.directions[0];
  if (separateRun && main) {
    const uploaded = await Promise.all(input.images.map((image) => api.uploadAttachment(project.id, image.file)));
    await api.startRun(project.id, main.id, {
      prompt: input.prompt,
      mode: 'edit',
      level,
      attachmentIds: uploaded.map((item) => item.id),
      ...refs,
    });
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
  const prefs = useHomePrefs();
  const pack = findPack(packs.packs, lastPackId);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [importPath, setImportPath] = useState('');
  const [showOpenFolder, setShowOpenFolder] = useState(false);
  const [advancedOpened, setAdvancedOpened] = useState(0);
  const [template, setTemplate] = useState<{
    id: string;
    label: string;
    starter: Starter | null;
  } | null>(null);
  const chooser = useFolderChooser(setFormError);
  const homeRef = useRef<HTMLDivElement>(null);
  const slashKeys = useRef<((e: KeyboardEvent<HTMLElement>) => boolean) | null>(null);
  const { workspaces, addFolder, renameFolder, forgetFolder, setDefaultFolder } = useWorkspaces(setFormError);
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<HomeToastState | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const onboarding = useOnboarding();
  const { projects, setProjects, listError, loadProjects, searchRef } = useHomeProjects();
  const templates = useModule(loadTemplates, prefs.templatesOpen);
  const extras = useModule(loadExtras, true);
  const listed = projects !== null || listError !== null;
  useEffect(() => {
    if (!listed) return;
    reportAppStart('home');
    prefetchScreensWhenIdle();
  }, [listed]);
  const { images, references, dragging, fileRef, addImages, removeImage, removeReference, onPromptPaste, dropHandlers } = useComposerAttachments(setFormError);
  const showToast = useCallback((next: Omit<HomeToastState, 'id'>) => setToast({ ...next, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const location = locationFor(workspaces, lastLocation);
  const setLocation = (path: string | null) => uiStore.set({ lastLocation: path });
  const locationLabel = folderLabel(workspaces, location);

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
    setShowOpenFolder(true);
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
      const project = await createFromHome({
        prompt: finalPrompt,
        kind,
        settings: parsed.settings,
        designMd,
        packId: pack?.id ?? null,
        designCount,
        location,
        images,
        references,
      });
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

  const openSelectedStarter = async (starter: Starter) => {
    setBusy('starter');
    setFormError(null);
    try {
      await openStarter(starter);
    } catch (err) {
      setFormError(`Could not open ${starter.name}: ${errorText(err)}`);
      setBusy(null);
    }
  };

  const openSample = async () => {
    const { project } = await api.createSample(location ?? undefined);
    onOpen(project.id);
  };

  const actions = useProjectActions({
    onOpen,
    setProjects,
    loadProjects,
    showToast,
  });

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

  const linkCode = async () => {
    const picked = await chooser.choose('Choose a folder with an index.html or a Vite app');
    if (picked.path) return void importFolder(picked.path);
    if (picked.unsupported) {
      setShowOpenFolder(true);
      focusOpenFolder();
    }
  };

  const pickTemplate = (picked: HomeTemplate, starter: Starter | null) => {
    if (template?.id === picked.id) {
      setTemplate(null);
      return;
    }
    setTemplate({ id: picked.id, label: picked.label, starter });
    setPrompt(picked.prompt);
    setQuestions(null);
    if (picked.kind) setKind(picked.kind);
    const level = picked.level;
    if (level) setSettingsDraft((d) => ({ ...d, defaultLevel: level }));
    focusPrompt(null, true);
  };

  const changeKind = (next: ProjectKind) => {
    setKind(next);
    setDesigns((n) => Math.min(n, maxVariationsFor(next)));
  };

  const modelValue = modelSummary(settingsDraft.model, designCount);
  const modelSizes = MODEL_OPTIONS.map((option) => modelSummary(option.id, designCount));
  const tabs = <Tabs tab={prefs.tab} />;
  const openAdvanced = () => {
    setAdvancedOpened((n) => n + 1);
    focusIn('.advanced summary');
  };
  const plusActions = {
    onAttachFile: () => fileRef.current?.click(),
    onAttachFolder: () => {
      setShowOpenFolder(true);
      focusOpenFolder();
    },
    onLinkCode: () => void linkCode(),
    onImportSystem: () => uiStore.set({ screen: 'design-systems', libraryFrom: null }),
    onSkills: openAdvanced,
    onLocation: () => focusIn('#new-project-location'),
  };
  const sendBlocker = homeSendBlocker(busy, prompt, questions !== null);
  const modelSettings: ModelSettings = {
    model: settingsDraft.model,
    onModel: (model) => setSettingsDraft((d) => ({ ...d, model })),
    level: settingsDraft.defaultLevel,
    onLevel: (defaultLevel) => setSettingsDraft((d) => ({ ...d, defaultLevel })),
    designs: { value: designCount, max: maxDesigns, onChange: setDesigns },
    onMore: openAdvanced,
  };
  const slashMod = useModule(loadSlash, prompt.startsWith('/'));

  return (
    <div className="home" ref={homeRef}>
      <header className="home-header">
        <BrandMark />
        <span className="brand">Design Studio</span>
        <div className="spacer" />
        <nav className="home-nav" aria-label="App">
          <button type="button" className="icon-btn" aria-label="Trash" data-tip="Trash" onPointerEnter={() => void loadTrash()} onClick={() => setTrashOpen(true)}>
            <Icon name="trash" size={16} />
          </button>
          <ThemeButton />
        </nav>
      </header>
      <main className="home-main">
        <section className="home-hero">
          <h1 className="ui-display">What should we create?</h1>
          <div className="home-card">
            <form className={`ui-composer home-composer${dragging ? ' dragging' : ''}`} onSubmit={create} {...dropHandlers}>
              <ComposerChips images={images} references={references} onRemoveImage={removeImage} onRemoveReference={removeReference} />
              <PromptArea value={prompt} onChange={setPrompt} onSubmit={create} onPaste={onPromptPaste} describedBy={sendBlocker && sendBlocker !== EMPTY_PROMPT ? HOME_REASON_ID : undefined} menuKeys={slashKeys} />
              {slashMod && <slashMod.HomeSlashMenu prompt={prompt} setPrompt={setPrompt} level={modelSettings.level} onLevel={modelSettings.onLevel} model={modelSettings.model} onModel={modelSettings.onModel} keys={slashKeys} home={homeRef} />}
              <DropHint on={dragging} />
              <StarterRow template={template} busy={busy} onOpen={(starter) => void openSelectedStarter(starter)} />
              <ComposerBar
                fileRef={fileRef}
                onFiles={addImages}
                plusActions={plusActions}
                locationLabel={locationLabel}
                packs={packs}
                pack={pack}
                kind={kind}
                onKind={changeKind}
                modelValue={modelValue}
                modelSizes={modelSizes}
                modelSettings={modelSettings}
                busy={busy}
                sendDisabled={sendBlocker}
              />
            </form>
            {questions ? (
              <Suspense fallback={null}>
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
              </Suspense>
            ) : (
              <>
                <Suspense fallback={null}>{onboarding.show && <FirstRunPanel onClose={onboarding.dismiss} onSample={openSample} />}</Suspense>
                <TemplatesSection open={prefs.templatesOpen} templates={templates} selected={template?.id ?? null} disabled={busy !== null} onPick={pickTemplate} />
              </>
            )}
          </div>
          {formError && <ComposerAlert onClose={() => setFormError(null)}>{formError}</ComposerAlert>}
          {extras && (
            <extras.ComposerFoot
              workspaces={workspaces}
              location={location}
              prompt={prompt}
              chooser={chooser}
              onLocation={setLocation}
              onAddFolder={addFolder}
              advanced={{
                opened: advancedOpened,
                draft: settingsDraft,
                onDraft: setSettingsDraft,
                designMd,
                onDesignMd: setDesignMd,
                onError: setFormError,
              }}
              openFolder={{
                shown: showOpenFolder || importPath !== '',
                busy: busy !== null,
                path: importPath,
                onPath: setImportPath,
                onImport: (p) => void importFolder(p),
              }}
              onHiddenMoved={() => void loadProjects()}
            />
          )}
        </section>
        {prefs.tab === 'projects' && (
          <>
            <ProjectGrid
              projects={shownProjects}
              packs={packs.packs}
              error={listError}
              actions={actions}
              query={query}
              onQuery={setQuery}
              searchRef={searchRef}
              filter={
                filterFolder
                  ? {
                      label: filterFolder.label,
                      onClear: () => setFolderFilter(null),
                    }
                  : null
              }
              tabs={tabs}
            />
            <Suspense fallback={null}>
              {projects !== null && projects.length === 0 && <StarterGallery disabled={busy !== null} onPick={openStarter} />}
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
            </Suspense>
          </>
        )}
        {prefs.tab !== 'projects' && (
          <OtherTab
            tab={prefs.tab}
            tabs={tabs}
            packs={packs}
            pack={pack}
            busy={busy}
            onStarter={openStarter}
            onPickPack={(id) => {
              uiStore.set({ lastPackId: id });
              focusPrompt(homeRef.current);
            }}
          />
        )}
      </main>
      {trashOpen && (
        <Suspense fallback={null}>
          <HomeTrash onClose={() => setTrashOpen(false)} onRestored={() => void loadProjects()} />
        </Suspense>
      )}
      <HomeToast toast={toast} onDone={clearToast} />
    </div>
  );
}
