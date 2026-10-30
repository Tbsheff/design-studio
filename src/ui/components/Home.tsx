import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { formatAnswers, needsQuestions } from '../../shared/clarify';
import { DEFAULT_SETTINGS, type ClarifyQuestion, type PackSummary, type Project, type ProjectKind, type ProjectSettings, type RunLevel, type Starter } from '../../shared/contracts';
import { shortenHome, type WorkspaceList } from '../../shared/folders';
import type { AppHealth } from '../../shared/found-apps';
import { api, errorText } from '../api';
import { onOpenAppRequest, takeOpenAppRequest } from '../openAppRequest';
import { findPack, pickable, usePacks, type PacksState } from '../packs';
import { homeVariations, uiStore, useUi } from '../storage';
import { maxVariationsFor } from '../variationsApi';
import { locationFor, useWorkspaces } from '../useWorkspaces';
import { useFolderChooser } from '../useFolderChooser';
import { hasNativePicker, pickFolder } from '../folderPicker';
import { homePrefs, useHomePrefs } from '../homePrefs';
import { projectsApi, useAppHealth } from '../projectsStore';
import { Icon } from './Icon';
import { usePresence } from '../usePresence';
import { ThemeButton } from './ThemeButton';
import { reportAppStart } from '../perfTelemetry';
import { prefetchScreensWhenIdle } from '../screens';
import { MODEL_OPTIONS, modelLabel, parseDraft, toDraft } from '../settingsDraft';
import { StableText } from './StableText';
import { BrandMark } from './BrandMark';
import { ComposerAlert, ComposerChips, useComposerAttachments, type ImageDraft, type ReferenceDraft } from './HomeComposerParts';
import { HomeToast, useHomeProjects, useProjectActions, type HomeToastState } from './HomeSections';
import { AppChipView, chipBlocker, chipName, chipProblem, droppedFolder, useAppChip, type AppChip } from './HomeAppChip';
import type { HomeTemplate } from './HomeTemplates';
import type { ModelSettings, PlusMenuActions } from './HomePopovers';
import type { DoctorProblem } from './HomeDoctor';

const clarifyChunk = import('./ClarifyForm');
const ClarifyForm = lazy(() => clarifyChunk.then((m) => ({ default: m.ClarifyForm })));
const libraryChunk = import('./HomeLibrary');
const loadTrash = () => import('./HomeTrash');
const loadSlash = () => import('./HomeSlash');
const HomeTrash = lazy(loadTrash);
const loadPops = () => import('./HomePopovers');
const PlusMenu = lazy(() => loadPops().then((m) => ({ default: m.PlusMenu })));
const PackPopover = lazy(() => loadPops().then((m) => ({ default: m.PackPopover })));
const ModelPopover = lazy(() => loadPops().then((m) => ({ default: m.ModelPopover })));
const LevelPopover = lazy(() => loadPops().then((m) => ({ default: m.LevelPopover })));
const loadTemplates = () => import('./HomeTemplates');
const loadExtras = () => import('./HomeExtras');
const loadAppMenu = () => import('./HomeAppMenu');
const AppMenu = lazy(() => loadAppMenu().then((m) => ({ default: m.AppMenu })));
const FolderPathPop = lazy(() => loadAppMenu().then((m) => ({ default: m.FolderPathPop })));
const HomeDoctor = lazy(() => import('./HomeDoctor'));
const HomeEmpty = lazy(() => import('./HomeEmpty'));

type Busy = 'create' | 'ask' | 'starter' | null;
type Pop = 'plus' | 'pack' | 'level' | 'model' | 'folder' | null;
type LibraryModule = typeof import('./HomeLibrary');

const EXAMPLES = ['Wireframe a settings page', 'Prototype a dashboard for tracking orders', 'A pricing page for a developer tool with three tiers', 'Turn my notes into a one-page brief', 'A mobile onboarding flow for a running app'];
const EXAMPLE_MS = 3500;
const LEVEL_LABEL: Record<RunLevel, string> = {
  wireframe: 'Wireframe',
  prototype: 'Prototype',
  polish: 'Polish',
};
const PLACEHOLDER = 'Describe what to design. Drop an app folder, an image or a link to build on it.';

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

const loadLibrary = () => libraryChunk;

function useExample(paused: boolean, fixed: boolean): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (paused || fixed) return;
    const timer = window.setInterval(() => setIndex((n) => (n + 1) % EXAMPLES.length), EXAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [paused, fixed]);
  return fixed ? PLACEHOLDER : (EXAMPLES[index] ?? '');
}

interface PromptAreaProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  describedBy?: string | undefined;
  menuKeys: { current: ((e: KeyboardEvent<HTMLTextAreaElement>) => boolean) | null };
  placeholder: string | null;
}

function PromptArea({ value, onChange, onSubmit, onPaste, describedBy, menuKeys, placeholder }: PromptAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const example = useExample(value !== '', placeholder === null);
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
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) onSubmit(e);
      }}
      placeholder={placeholder ?? example}
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

function focusIn(selector: string): void {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus();
  }, 60);
}

const HOME_REASON_ID = 'home-send-reason';
const EMPTY_PROMPT = 'Describe the design first';

function SendButton({ busy, disabled, reason, label }: { busy: Busy; disabled: boolean; reason: string | null; label: string }) {
  const working = busy === 'create' || busy === 'ask';
  return (
    <button className="icon-btn send home-send" type="submit" disabled={disabled} aria-busy={working || undefined} aria-label={busy === 'ask' ? 'Thinking' : busy === 'create' ? 'Working' : label} data-tip={disabled && reason ? reason : `${label}  ↩`} data-tip-align="end" data-tip-side="top">
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

function DropHint({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="home-drop-hint" aria-hidden="true">
      <Icon name="image" size={16} />
      Drop an app folder, an image or a link to build on it
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

function TemplatesSection({ templates, selected, disabled, onPick }: { templates: TemplatesModule | null; selected: string | null; disabled: boolean; onPick: (template: HomeTemplate, starter: Starter | null) => void }) {
  return (
    <section className="home-templates" aria-label="Templates and starters">
      <button type="button" className="ui-section-label home-templates-toggle" aria-expanded onClick={() => homePrefs.set({ templatesShown: false })}>
        Templates and starters
        <Icon name="close" size={10} />
      </button>
      {templates ? <templates.HomeTemplateGrid selected={selected} disabled={disabled} onPick={onPick} /> : <div className="home-tile-placeholder" aria-hidden="true" />}
    </section>
  );
}

interface AppSlotProps {
  chip: AppChip | null;
  pop: Pop;
  folderRef: RefObject<HTMLButtonElement | null>;
  onAddFolder: () => void;
  onDoctor: () => void;
}

function AppSlot({ chip, pop, folderRef, onAddFolder, onDoctor }: AppSlotProps) {
  if (!chip) {
    return (
      <button ref={folderRef} type="button" className="home-pill" aria-haspopup="dialog" aria-expanded={pop === 'folder'} onPointerEnter={() => void loadAppMenu()} onClick={onAddFolder}>
        <Icon name="folder" size={14} />
        Add app folder
      </button>
    );
  }
  const blocker = chipBlocker(chip);
  if (blocker) {
    return (
      <button type="button" className="home-badge warn home-badge-btn" onClick={onDoctor}>
        Fix the app first: {blocker.command}
      </button>
    );
  }
  if (!chip.inspection?.kind || chipProblem(chip)) return null;
  return <span className={`home-badge ${chip.inspection.kind === 'next' ? 'next' : chip.inspection.kind === 'vite' ? 'vite' : 'html'}`}>Edits {chipName(chip)}</span>;
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
  app: Omit<AppSlotProps, 'pop' | 'folderRef'> & { folderPop: boolean; onFolderPick: (path: string) => void; onFolderClose: () => void };
}

function ComposerBar({ fileRef, onFiles, plusActions, locationLabel, packs, pack, kind, onKind, modelValue, modelSizes, modelSettings, busy, sendDisabled, app }: ComposerBarProps) {
  const [pop, setPop] = useState<Pop>(null);
  const shownPop = usePresence(pop);
  const plusRef = useRef<HTMLButtonElement>(null);
  const packRef = useRef<HTMLButtonElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const levelRef = useRef<HTMLButtonElement>(null);
  const folderRef = useRef<HTMLButtonElement>(null);
  const closePop = useCallback(
    (refocus: boolean) => {
      const trigger = { plus: plusRef, pack: packRef, level: levelRef, model: modelRef, folder: folderRef }[pop ?? 'model'];
      setPop(null);
      if (refocus) trigger.current?.focus();
    },
    [pop],
  );
  const togglePop = (next: Exclude<Pop, null>) => setPop((current) => (current === next ? null : next));
  useEffect(() => setPop((current) => (app.folderPop ? 'folder' : current === 'folder' ? null : current)), [app.folderPop]);
  const closeFolder = (refocus: boolean) => {
    closePop(refocus);
    app.onFolderClose();
  };
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
        <button ref={plusRef} type="button" className="icon-btn bordered home-square" aria-label="Add" aria-haspopup="menu" aria-expanded={pop === 'plus'} data-tip="Attach, import and options" data-tip-align="start" onPointerEnter={() => void loadPops()} onClick={() => togglePop('plus')}>
          <Icon name="plus" size={16} />
        </button>
        {shownPop.shown === 'plus' && (
          <Suspense fallback={null}>
            <PlusMenu trigger={plusRef} closing={shownPop.closing} onClose={closePop} locationLabel={locationLabel} actions={{ ...plusActions, onDesignSystem: () => setPop('pack') }} />
          </Suspense>
        )}
      </div>
      <div className="home-anchor">
        <AppSlot chip={app.chip} pop={pop} folderRef={folderRef} onAddFolder={app.onAddFolder} onDoctor={app.onDoctor} />
        {shownPop.shown === 'folder' && (
          <Suspense fallback={null}>
            <FolderPathPop trigger={folderRef} closing={shownPop.closing} onClose={closeFolder} onPick={app.onFolderPick} />
          </Suspense>
        )}
      </div>
      {!app.chip && (
        <button type="button" className="icon-btn bordered home-square home-kind" aria-pressed={kind === 'react'} aria-label="React + Vite project" data-tip={kind === 'react' ? 'React + Vite project. Press for a plain HTML page.' : 'Plain HTML page. Press for a React + Vite project.'} onClick={() => onKind(kind === 'react' ? 'html' : 'react')}>
          <Icon name="code" size={16} />
        </button>
      )}
      <div className="spacer" />
      <div className="home-anchor end">
        <PillSelect label="Design system" ariaLabel="Design system" value={pack?.name ?? 'None'} open={pop === 'pack'} triggerRef={packRef} onOpen={() => togglePop('pack')} />
        {shownPop.shown === 'pack' && (
          <Suspense fallback={null}>
            <PackPopover trigger={packRef} closing={shownPop.closing} onClose={closePop} state={pickable(packs)} value={pack?.id ?? null} onChange={(id) => uiStore.set({ lastPackId: id })} onNew={() => uiStore.set({ screen: 'new-design-system', returnTo: 'home' })} />
          </Suspense>
        )}
      </div>
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
      <SendButton busy={busy} disabled={sendDisabled !== null} reason={sendDisabled} label={app.chip ? 'Open' : 'Create'} />
    </div>
  );
}

function useOpenAppRequests(onPath: (path: string) => void, onPick: () => void): void {
  const handlers = useRef({ onPath, onPick });
  handlers.current = { onPath, onPick };
  useEffect(() => {
    const take = () => {
      const request = takeOpenAppRequest();
      if (!request) return;
      if (request.path) handlers.current.onPath(request.path);
      else handlers.current.onPick();
    };
    take();
    return onOpenAppRequest(take);
  }, []);
}

function homeSendBlocker(busy: Busy, prompt: string, asking: boolean, chip: AppChip | null): string | null {
  if (busy !== null) return 'Working on it';
  if (chip) return chip.checking ? 'Checking the folder' : chipProblem(chip);
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

interface DoctorGate {
  problem: DoctorProblem;
  checking: boolean;
  check: () => Promise<boolean>;
  proceed: () => void;
}

function installProblem(name: string, place: string, kindLabel: string, install: { command: string; dir: string }): DoctorProblem {
  return {
    name,
    place,
    badge: { label: kindLabel, tone: kindLabel === 'Vite' ? 'vite' : 'next' },
    steps: [
      { ok: true, text: `package.json · ${kindLabel}` },
      { ok: false, text: 'node_modules is missing' },
    ],
    detail: `${name} cannot start yet. The app's dependencies are not installed, so the dev server cannot start. Run ${install.command} in ${install.dir}, then check again.`,
    command: `cd ${JSON.stringify(install.dir)} && ${install.command}`,
  };
}

function healthProblem(project: Project, health: AppHealth, place: string): DoctorProblem {
  const label = project.app?.framework === 'next' ? 'Next.js' : 'Vite';
  return {
    name: project.name,
    place,
    badge: { label, tone: label === 'Vite' ? 'vite' : 'next' },
    steps: [
      { ok: true, text: `package.json · ${label}` },
      { ok: false, text: health.state === 'install' ? 'node_modules is missing' : (health.title ?? 'The dev server failed') },
    ],
    detail: health.detail ?? health.title ?? 'The dev server cannot start.',
    command: health.command,
  };
}

function useDoctorGate() {
  const [gate, setGate] = useState<DoctorGate | null>(null);
  const close = useCallback(() => setGate(null), []);
  const check = async () => {
    if (!gate) return;
    setGate({ ...gate, checking: true });
    const fixed = await gate.check().catch(() => false);
    if (fixed) {
      setGate(null);
      gate.proceed();
    } else setGate({ ...gate, checking: false });
  };
  return { gate, open: (next: Omit<DoctorGate, 'checking'>) => setGate({ ...next, checking: false }), close, check };
}

function shortHome(target: string, homeDir: string | null): string {
  return shortenHome(target.replace(/^\/private(?=\/)/, ''), homeDir);
}

function Library({ lib, projects, health, homeDir, actions, packs, pack, query, onQuery, searchRef, listError, onPickPack }: { lib: LibraryModule | null; projects: Project[]; health: Map<string, AppHealth>; homeDir: string | null; actions: ReturnType<typeof useProjectActions>; packs: PacksState; pack: PackSummary | null; query: string; onQuery: (q: string) => void; searchRef: RefObject<HTMLInputElement | null>; listError: string | null; onPickPack: (id: string | null) => void }) {
  const { filter } = useHomePrefs();
  if (!lib) return <div className="home-continue placeholder" aria-hidden="true" />;
  const listed = projects.filter((project) => !project.designSystemFor);
  const latest = [...listed].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const chips = <lib.FilterChips filter={filter} />;
  return (
    <>
      {latest && <lib.ContinueCard project={latest} health={health.get(latest.id) ?? null} onOpen={actions.onOpen} />}
      {filter === 'systems' ? (
        <section className="home-list" aria-label="Design systems">
          <div className="home-list-head">
            {chips}
            <div className="spacer" />
            <button type="button" className="btn small" onClick={() => uiStore.set({ screen: 'new-design-system', returnTo: 'home' })}>
              New design system
            </button>
            <button type="button" className="btn small" onClick={() => uiStore.set({ screen: 'design-systems', libraryFrom: null })}>
              Open library
            </button>
          </div>
          <p className="home-section-hint">Pick one for your next project. Edit, import and export them in the library.</p>
          <lib.PackCards packs={pickable(packs).packs ?? []} value={pack?.id ?? null} includeNone={false} onPick={(picked) => onPickPack(picked?.id ?? null)} />
        </section>
      ) : (
        <lib.ProjectGrid projects={lib.filterLibrary(listed, filter)} packs={packs.packs} health={health} homeDir={homeDir} error={listError} actions={actions} query={query} onQuery={onQuery} searchRef={searchRef} filter={filter === 'all' ? null : { label: lib.FILTER_EMPTY[filter], onClear: () => homePrefs.set({ filter: 'all' }) }} tabs={chips} />
      )}
    </>
  );
}

function Header({ onTrash }: { onTrash: () => void }) {
  return (
    <header className="home-header">
      <BrandMark />
      <span className="brand">Design Studio</span>
      <div className="spacer" />
      <nav className="home-nav" aria-label="App">
        <button type="button" className="btn small ghost home-goto" data-tip="Find a project, folder or action" onClick={() => window.dispatchEvent(new CustomEvent('studio:command-layer', { detail: 'palette' }))}>
          <Icon name="search" size={14} />
          Go to
          <kbd aria-hidden="true">⌘K</kbd>
        </button>
        <button type="button" className="btn small ghost" onPointerEnter={() => void loadTrash()} onClick={onTrash}>
          <Icon name="trash" size={14} />
          Trash
        </button>
        <ThemeButton />
      </nav>
    </header>
  );
}

function hasFiles(event: DragEvent): boolean {
  return [...event.dataTransfer.types].includes('Files');
}

function promptPlaceholder(chip: AppChip | null, empty: boolean): string | null {
  if (chip) return `Describe a change to ${chipName(chip)}, or press Return to open it`;
  return empty ? PLACEHOLDER : null;
}

function reasonId(blocker: string | null): string | undefined {
  return blocker && blocker !== EMPTY_PROMPT ? HOME_REASON_ID : undefined;
}

function isEmpty(projects: Project[] | null): boolean {
  return projects !== null && projects.filter((project) => !project.designSystemFor).length === 0;
}

function homeOf(workspaces: WorkspaceList | null): string | null {
  return workspaces?.homeDir ?? null;
}

function ChipMenuSlot({ shown, closing, chip, homeDir, chipRef, onClose, onChange, onTokensOnly }: { shown: boolean; closing: boolean; chip: AppChip | null; homeDir: string | null; chipRef: RefObject<HTMLDivElement | null>; onClose: () => void; onChange: (patch: Partial<AppChip>) => void; onTokensOnly: () => void }) {
  if (!shown || !chip) return null;
  const trigger = { current: chipRef.current?.querySelector<HTMLElement>('.home-chip-app') ?? null };
  return (
    <Suspense fallback={null}>
      <AppMenu chip={chip} homeDir={homeDir} trigger={trigger} closing={closing} onClose={onClose} onChange={onChange} onTokensOnly={onTokensOnly} />
    </Suspense>
  );
}

function HeroNotes({ windowDrag, formError, onClearError }: { windowDrag: boolean; formError: string | null; onClearError: () => void }) {
  return (
    <>
      {windowDrag && <p className="home-drop-anywhere">Drop anywhere: the folder goes on the prompt</p>}
      {formError && <ComposerAlert onClose={onClearError}>{formError}</ComposerAlert>}
    </>
  );
}

function HomeOverlays({ trashOpen, onCloseTrash, onRestored, doctor, toast, onToastDone }: { trashOpen: boolean; onCloseTrash: () => void; onRestored: () => void; doctor: ReturnType<typeof useDoctorGate>; toast: HomeToastState | null; onToastDone: () => void }) {
  const gate = doctor.gate;
  return (
    <>
      {trashOpen && (
        <Suspense fallback={null}>
          <HomeTrash onClose={onCloseTrash} onRestored={onRestored} />
        </Suspense>
      )}
      {gate && (
        <Suspense fallback={null}>
          <HomeDoctor
            problem={gate.problem}
            checking={gate.checking}
            onCheck={() => void doctor.check()}
            onOpenAnyway={() => {
              doctor.close();
              gate.proceed();
            }}
            onClose={doctor.close}
          />
        </Suspense>
      )}
      <HomeToast toast={toast} onDone={onToastDone} />
    </>
  );
}

function LibraryArea({ empty, busy, listError, onRetry, onUse, onSample, onStarter, children }: { empty: boolean; busy: boolean; listError: string | null; onRetry: () => void; onUse: (path: string) => void; onSample: () => void; onStarter: (starter: Starter) => void; children: ReactNode }) {
  if (empty) {
    return (
      <Suspense fallback={null}>
        <HomeEmpty busy={busy} onUse={onUse} onSample={onSample} onStarter={onStarter} />
      </Suspense>
    );
  }
  return (
    <>
      {children && <div className="home-library">{children}</div>}
      {!children && listError && <ComposerAlert onClose={onRetry}>{listError}</ComposerAlert>}
    </>
  );
}

interface ChipFlowDeps {
  onOpen: (projectId: string) => void;
  setBusy: (busy: Busy) => void;
  setFormError: (message: string | null) => void;
  homeRef: RefObject<HTMLDivElement | null>;
  homeDir: string | null;
  level: RunLevel;
  attached: RefObject<{ images: ImageDraft[]; references: ReferenceDraft[] }>;
  doctor: ReturnType<typeof useDoctorGate>;
}

function useChipFlow({ onOpen, setBusy, setFormError, homeRef, homeDir, level, attached, doctor }: ChipFlowDeps) {
  const app = useAppChip();
  const [folderPop, setFolderPop] = useState(false);
  const [appMenu, setAppMenu] = useState(false);
  const putFolder = useCallback(
    (path: string) => {
      app.set(path);
      setFormError(null);
      focusPrompt(homeRef.current, true);
    },
    [app, homeRef, setFormError],
  );
  const takeDrop = (data: DataTransfer): boolean => {
    const folder = droppedFolder(data);
    if (!folder) return false;
    if ('path' in folder) putFolder(folder.path);
    else setFormError('Drop a folder in the desktop app, or use Add app folder.');
    return true;
  };
  const addAppFolder = async () => {
    if (!hasNativePicker()) {
      setFolderPop((open) => !open);
      return;
    }
    const picked = await pickFolder({ title: 'Choose your app folder' });
    if (picked.kind === 'picked') putFolder(picked.path);
  };
  useOpenAppRequests(putFolder, () => void addAppFolder());

  const chipCandidates = app.chip?.inspection?.candidates.length ?? 0;
  const chipPicked = app.chip?.appDir ?? null;
  useEffect(() => {
    if (chipCandidates > 1 && chipPicked === null) setAppMenu(true);
  }, [chipCandidates, chipPicked]);

  const openChip = async (text: string, tokensOnly = false) => {
    const chip = app.chip;
    if (!chip) return;
    setBusy('create');
    setFormError(null);
    try {
      const mod = await loadAppMenu();
      const pid = await mod.openChip(chip, tokensOnly);
      if (text) await mod.runInProject(pid, { prompt: text, level, images: attached.current.images.map((image) => image.file), referenceUrls: attached.current.references.map((reference) => reference.url) });
      onOpen(pid);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const chipDoctor = (text: string) => {
    const chip = app.chip;
    const found = chip?.inspection;
    const install = chipBlocker(chip);
    if (!chip || !found || !install) return;
    doctor.open({
      problem: installProblem(found.name, shortHome(found.path, homeDir), found.kind === 'vite' ? 'Vite' : 'Next.js', install),
      check: async () => (await api.inspectFolder(found.path, chip.appDir ?? undefined)).depsInstalled !== false,
      proceed: () => void openChip(text),
    });
  };

  const submitChip = (text: string) => {
    const chip = app.chip;
    if (!chip || chip.checking) return;
    const problem = chipProblem(chip);
    if (problem) setFormError(problem);
    else if (chipBlocker(chip)) chipDoctor(text);
    else void openChip(text);
  };

  return { app, folderPop, setFolderPop, appMenu, setAppMenu, putFolder, takeDrop, addAppFolder, openChip, chipDoctor, submitChip };
}

function useRootDrop(takeDrop: (data: DataTransfer) => boolean, setFormError: (message: string | null) => void) {
  const [windowDrag, setWindowDrag] = useState(false);
  const rootDrop = {
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setWindowDrag(true);
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!event.relatedTarget) setWindowDrag(false);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      setWindowDrag(false);
      if (event.defaultPrevented || !hasFiles(event)) return;
      event.preventDefault();
      if (!takeDrop(event.dataTransfer)) setFormError('Drop images or a folder on the prompt.');
    },
  };
  return { windowDrag, rootDrop };
}

interface FlowDeps {
  onOpen: (projectId: string) => void;
  setBusy: (busy: Busy) => void;
  setFormError: (message: string | null) => void;
  location: string | null;
  health: Map<string, AppHealth>;
  homeDir: string | null;
  doctor: ReturnType<typeof useDoctorGate>;
}

function useOpenFlows({ onOpen, setBusy, setFormError, location, health, homeDir, doctor }: FlowDeps) {
  const openStarter = async (starter: Starter) => {
    setBusy('starter');
    setFormError(null);
    try {
      const { project } = await api.createFromStarter(starter.id, location ?? undefined);
      onOpen(project.id);
    } catch (err) {
      setFormError(`Could not open ${starter.name}: ${errorText(err)}`);
      setBusy(null);
    }
  };

  const openSample = async () => {
    setBusy('starter');
    try {
      const { project } = await api.createSample(location ?? undefined);
      onOpen(project.id);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(null);
    }
  };

  const openProject = (project: Project) => {
    const state = health.get(project.id);
    if (!state || (state.state !== 'install' && state.state !== 'failed')) return onOpen(project.id);
    doctor.open({
      problem: healthProblem(project, state, project.imported ? shortHome(project.imported.sourcePath, homeDir) : project.name),
      check: async () => {
        const fresh = (await projectsApi.health()).find((item) => item.projectId === project.id);
        return !fresh || (fresh.state !== 'install' && fresh.state !== 'failed');
      },
      proceed: () => onOpen(project.id),
    });
  };

  return { openStarter, openSample, openProject };
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
  const [advancedOpened, setAdvancedOpened] = useState(0);
  const [template, setTemplate] = useState<{ id: string; label: string; starter: Starter | null } | null>(null);
  const chooser = useFolderChooser(setFormError);
  const homeRef = useRef<HTMLDivElement>(null);
  const slashKeys = useRef<((e: KeyboardEvent<HTMLElement>) => boolean) | null>(null);
  const { workspaces, addFolder } = useWorkspaces(setFormError);
  const [questions, setQuestions] = useState<ClarifyQuestion[] | null>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<HomeToastState | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const doctor = useDoctorGate();
  const { projects, listError, loadProjects, searchRef } = useHomeProjects();
  const health = useAppHealth(projects);
  const homeDir = homeOf(workspaces);
  const attached = useRef<{ images: ImageDraft[]; references: ReferenceDraft[] }>({ images: [], references: [] });
  const flow = useChipFlow({ onOpen, setBusy, setFormError, homeRef, homeDir, level: settingsDraft.defaultLevel, attached, doctor });
  const { app, folderPop, setFolderPop, appMenu, setAppMenu, putFolder, takeDrop, addAppFolder, openChip, chipDoctor, submitChip } = flow;
  const shownAppMenu = usePresence(appMenu ? 'menu' : null);
  const templates = useModule(loadTemplates, prefs.templatesShown);
  const extras = useModule(loadExtras, true);
  const library = useModule(loadLibrary, true);
  const listed = projects !== null || listError !== null;
  const empty = isEmpty(projects);
  useEffect(() => {
    if (!listed) return;
    reportAppStart('home');
    prefetchScreensWhenIdle();
  }, [listed]);
  const { images, references, dragging, fileRef, addImages, removeImage, removeReference, onPromptPaste, dropHandlers } = useComposerAttachments(setFormError, takeDrop);
  attached.current = { images, references };
  const { windowDrag, rootDrop } = useRootDrop(takeDrop, setFormError);
  const showToast = useCallback((next: Omit<HomeToastState, 'id'>) => setToast({ ...next, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const location = locationFor(workspaces, lastLocation);
  const { openStarter, openSample, openProject } = useOpenFlows({ onOpen, setBusy, setFormError, location, health, homeDir, doctor });
  const setLocation = (path: string | null) => uiStore.set({ lastLocation: path });
  const locationLabel = folderLabel(workspaces, location);

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
    if (busy !== null) return;
    if (app.chip) return submitChip(text);
    if (!text) return;
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

  const actions = useProjectActions({ onOpen: openProject, showToast, onOpenTrash: () => setTrashOpen(true), homeDir });

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
  const openAdvanced = () => {
    setAdvancedOpened((n) => n + 1);
    focusIn('.advanced summary');
  };
  const plusActions = {
    onAttachFile: () => fileRef.current?.click(),
    onLinkCode: () => void addAppFolder(),
    onTemplates: () => homePrefs.set({ templatesShown: !prefs.templatesShown }),
    templatesShown: prefs.templatesShown,
    onImportSystem: () => uiStore.set({ screen: 'design-systems', libraryFrom: null }),
    onSkills: openAdvanced,
    onLocation: () => focusIn('#new-project-location'),
  };
  const sendBlocker = homeSendBlocker(busy, prompt, questions !== null, app.chip);
  const modelSettings: ModelSettings = {
    model: settingsDraft.model,
    onModel: (model) => setSettingsDraft((d) => ({ ...d, model })),
    level: settingsDraft.defaultLevel,
    onLevel: (defaultLevel) => setSettingsDraft((d) => ({ ...d, defaultLevel })),
    designs: { value: designCount, max: maxDesigns, onChange: setDesigns },
    onMore: openAdvanced,
  };
  const slashMod = useModule(loadSlash, prompt.startsWith('/'));
  const chipLead: ReactNode = app.chip ? <AppChipView chip={app.chip} menuOpen={appMenu} onMenu={() => setAppMenu((open) => !open)} onRemove={app.clear} /> : null;
  return (
    <div className="home" data-drop={windowDrag || undefined} ref={homeRef} {...rootDrop}>
      <Header onTrash={() => setTrashOpen(true)} />
      <main className="home-main">
        <section className="home-hero">
          {empty ? <h1 className="ui-display">What should we design?</h1> : <h1 className="sr-only">Home</h1>}
          <div className="home-card" ref={chipRef}>
            <form className={`ui-composer home-composer${dragging ? ' dragging' : ''}`} onSubmit={create} {...dropHandlers}>
              <ComposerChips lead={chipLead} images={images} references={references} onRemoveImage={removeImage} onRemoveReference={removeReference} />
              <ChipMenuSlot shown={shownAppMenu.shown !== null} closing={shownAppMenu.closing} chip={app.chip} homeDir={homeDir} chipRef={chipRef} onClose={() => setAppMenu(false)} onChange={app.update} onTokensOnly={() => {
                setAppMenu(false);
                void openChip(prompt.trim(), true);
              }} />
              <PromptArea value={prompt} onChange={setPrompt} onSubmit={create} onPaste={onPromptPaste} describedBy={reasonId(sendBlocker)} menuKeys={slashKeys} placeholder={promptPlaceholder(app.chip, empty)} />
              {slashMod && <slashMod.HomeSlashMenu prompt={prompt} setPrompt={setPrompt} level={modelSettings.level} onLevel={modelSettings.onLevel} model={modelSettings.model} onModel={modelSettings.onModel} keys={slashKeys} home={homeRef} />}
              <DropHint on={dragging} />
              <StarterRow template={template} busy={busy} onOpen={(starter) => void openStarter(starter)} />
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
                app={{ chip: app.chip, onAddFolder: () => void addAppFolder(), onDoctor: () => chipDoctor(prompt.trim()), folderPop, onFolderPick: putFolder, onFolderClose: () => setFolderPop(false) }}
              />
            </form>
            {questions && !app.chip && (
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
            )}
            {!questions && prefs.templatesShown && <TemplatesSection templates={templates} selected={template?.id ?? null} disabled={busy !== null} onPick={pickTemplate} />}
          </div>
          <HeroNotes windowDrag={windowDrag} formError={formError} onClearError={() => setFormError(null)} />
          {extras && !app.chip && (
            <extras.ComposerFoot
              workspaces={workspaces}
              location={location}
              prompt={prompt}
              chooser={chooser}
              onLocation={setLocation}
              onAddFolder={addFolder}
              advanced={{ opened: advancedOpened, draft: settingsDraft, onDraft: setSettingsDraft, designMd, onDesignMd: setDesignMd, onError: setFormError }}
              onHiddenMoved={() => void loadProjects()}
            />
          )}
        </section>
        <LibraryArea empty={empty} busy={busy !== null} listError={listError} onRetry={() => void loadProjects()} onUse={putFolder} onSample={() => void openSample()} onStarter={(starter) => void openStarter(starter)}>
          {projects !== null && <Library lib={library} projects={projects} health={health} homeDir={homeDir} actions={actions} packs={packs} pack={pack} query={query} onQuery={setQuery} searchRef={searchRef} listError={listError} onPickPack={(id) => {
            uiStore.set({ lastPackId: id });
            focusPrompt(homeRef.current);
          }} />}
        </LibraryArea>
      </main>
      <HomeOverlays trashOpen={trashOpen} onCloseTrash={() => setTrashOpen(false)} onRestored={() => void loadProjects()} doctor={doctor} toast={toast} onToastDone={clearToast} />
    </div>
  );
}
