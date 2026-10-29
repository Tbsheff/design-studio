import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVariations } from '../useVariations';
import { VariationsTop, canvasVariations } from './VariationsLayer';
import type { CommentPrefill, CompiledTokenEntry, Project, RunCanvasRef, RunEffort, RunLevel, RunMention, RunRequest, SelectionContext, Version } from '../../shared/contracts';
import { useRunCanvas } from '../useRunCanvas';
import { runStepText } from './ToolChips';
import type { PrefillRequest } from '../useCommentPrefill';
import { RunCommentsContext } from './RunComments';
import { statesPrompt } from '../../shared/states';
import { activeFrame, canvasStore, defaultLayout, type CanvasFrame } from '../canvasFrames';
import type { ComposerMode } from './RunSettings';
import { api, errorText } from '../api';
import { POLISH_REQUEST } from '../polish';
import { createDraftStore, homeVariations, uiStore, useDraftActive, useUi, type DraftStore } from '../storage';
import { setLeaveCheck } from '../route';
import { useDesignSystemState } from '../useDesignSystemState';
import { usePackActions } from '../usePackActions';
import { useStudioData } from '../useStudioData';
import type { PreviewPort } from '../bridge';
import { inspectorEmptyReason, isDirectEditable, type InspectorTab } from './Inspector';
import type { EditSessionHandle } from '../useEditSession';
import { runCommand } from '../commands/registry';
import { useTryVariants } from '../useTryVariants';
import { usePanelTab } from '../usePanelTab';
import { undoAllowed } from '../useUndoShortcut';
import { mergeCommit, type DirectEditControl } from '../useDirectEdit';
import type { CanvasSource } from './CanvasToolbar';
import { chatWidthStyle } from './ChatSplitter';
import { fixPrompt } from './ErrorsPanel';
import { DraftBar } from './DraftBar';
import { ImproveControl, improveRequest, lastImproveRun } from './DraftImprove';
import { useDraftChrome } from './DraftSources';
import { LeftPane } from './LeftPane';
import { StudioPaneHeader } from './StudioPaneHeader';
import { DesignSystemChip, designSystemRef } from './DesignSystemChip';
import { CenterView, StudioBoot, StudioModals, StudioToast, UnfinishedSlot, runStoppedUnsaved } from './StudioParts';
import { useStudioTokens } from '../useStudioTokens';
import { useComponents } from '../useComponents';
import { componentMention, type MentionRequest } from '../useMentions';
import { useEditHistory, useSelectionRefresh } from '../useEditHistory';
import { TWEAKS_REQUEST, useTweaks } from '../useTweaks';
import { useDesktopContext } from '../desktop';
import { useComments } from '../useComments';
import { useRunControls } from '../useRunControls';
import { emptyRun, shownPending, type RunView } from '../runState';
import { randomToken } from '../session';
import { useChatState } from '../useChatState';
import { useRewind } from '../useRewind';
import { useMcpFeed } from '../useMcpFeed';
import { setTelemetryScope } from '../perfTelemetry';
import { renameVersion } from '../versionsApi';
import { useExportTarget } from '../useExportTarget';
import type { ExportTarget } from '../exportApi';
import type { ShareTarget } from './ShareDialog';

const ExportDialog = lazy(() => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })));
const ShipDialog = lazy(() => import('./ShipDialog'));
const RulesEditor = lazy(() => import('./RulesEditor'));
const ShareDialog = lazy(() => import('./ShareDialog'));

function RulesSlot({ projectId, directionId }: { projectId: string; directionId: string | null }) {
  if (!directionId) return null;
  return (
    <Suspense fallback={null}>
      <RulesEditor key={directionId} projectId={projectId} directionId={directionId} />
    </Suspense>
  );
}

function ShipLayer({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <ShipDialog projectId={projectId} onClose={onClose} />
    </Suspense>
  );
}

function ShareLayer({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  if (!target) return null;
  return (
    <Suspense fallback={null}>
      <ShareDialog target={target} onClose={onClose} />
    </Suspense>
  );
}

function ExportLayer({ target, onClose }: { target: ExportTarget | null; onClose: () => void }) {
  if (!target) return null;
  return (
    <Suspense fallback={null}>
      <ExportDialog target={target} onClose={onClose} />
    </Suspense>
  );
}
import { useStudioCommands } from '../commands/useStudioCommands';
import { prefetchCommandLayer } from '../screens';

function firstText(...texts: (string | null | undefined)[]): string | null {
  return texts.find((text) => typeof text === 'string') ?? null;
}

function useHomeVariationsHandoff(projectId: string, ready: boolean, propose: ReturnType<typeof useVariations>['propose']): void {
  useEffect(() => {
    if (!ready) return;
    const intent = homeVariations.take(projectId);
    if (intent) void propose(intent.prompt, intent.level, [], intent.count);
  }, [ready, projectId, propose]);
}

interface ComposeInput {
  prompt: string;
  mode: ComposerMode;
  attachmentIds: string[];
  level: RunLevel;
  effort: RunEffort | null;
  mentions: RunMention[];
  selection: SelectionContext[];
  canvas?: RunCanvasRef;
}

function composeRequest(input: ComposeInput): RunRequest {
  return {
    prompt: input.prompt,
    ...modeOf(input.mode),
    level: input.level,
    ...effortOf(input.effort),
    ...(input.mentions.length > 0 ? { mentions: input.mentions } : {}),
    selection: input.selection.length > 0 ? input.selection : undefined,
    attachmentIds: input.attachmentIds.length > 0 ? input.attachmentIds : undefined,
    ...(input.canvas ? { canvas: input.canvas } : {}),
  };
}

function withCommentIds(request: RunRequest, commentIds: string[]): RunRequest {
  return commentIds.length > 0 && request.mode === 'edit' ? { ...request, commentIds } : request;
}

function buildPlanRequest(run: RunView): RunRequest {
  const level = run.request?.level;
  return { prompt: 'Build the plan above.', mode: 'edit', ...(level ? { level } : {}) };
}

function hasDarkMode(tokens: { mode: string; entries: CompiledTokenEntry[] } | null): boolean {
  return tokens?.mode === 'light' && tokens.entries.some((entry) => entry.darkValue !== undefined && entry.darkValue !== null);
}

function tokenEntries(tokens: { entries: CompiledTokenEntry[] } | null): CompiledTokenEntry[] {
  return tokens?.entries ?? [];
}

function modeOf(mode: ComposerMode): Pick<RunRequest, 'mode' | 'plan'> {
  return mode === 'plan' ? { mode: 'edit', plan: true } : { mode };
}

function effortOf(effort: RunEffort | null): Pick<RunRequest, 'effort'> {
  return effort ? { effort } : {};
}

function shipOpener(project: { app?: unknown }, setOpen: (open: boolean) => void): (() => void) | null {
  return project.app ? () => setOpen(true) : null;
}

function exportTarget(versions: Version[], direction: { headVersionId: string | null } | null): string | null {
  return (versions.find((v) => v.id === direction?.headVersionId) ?? versions[0])?.id ?? null;
}

function runById<T>(runs: Record<string, T>, id: string | null): T | null {
  return id ? (runs[id] ?? null) : null;
}

function paneAttr(collapsed: boolean): string {
  return collapsed ? 'collapsed' : 'open';
}

function nameOf(direction: { name: string } | null): string | null {
  return direction?.name ?? null;
}

const FRAMEWORK_LABEL = { next: 'Next.js app', vite: 'Vite app' } as const;

function kindLabel(project: Project): string {
  if (project.app) return FRAMEWORK_LABEL[project.app.framework];
  return project.kind === 'html' ? 'HTML project' : 'React + Vite project';
}

function whenDirection<T>(did: string | null, value: T): T | null {
  return did ? value : null;
}

function neverRan(runsLoaded: boolean, runs: readonly unknown[]): boolean {
  return runsLoaded && runs.length === 0;
}

function appDirOf(project: { app?: { appDir: string } | null }): string | null {
  return project.app?.appDir ?? null;
}

async function askAgent(prompt: string, draft: DraftStore, showChat: () => Promise<boolean>): Promise<void> {
  if (!(await showChat())) return;
  draft.set(prompt);
  window.requestAnimationFrame(() => {
    const input = document.querySelector<HTMLTextAreaElement>('.prompt [data-slot="composer-input"]');
    input?.focus();
    input?.setSelectionRange(prompt.length, prompt.length);
  });
}

function runStepOf(run: RunView | null, direction: { workTree: string } | null | undefined): string | null {
  return runStepText(run, direction?.workTree ?? null);
}

export function Studio({ projectId, onExit }: { projectId: string; onExit: () => void }) {
  const data = useStudioData(projectId);
  const { project, directionId, versions, runs, status } = data;
  const [selection, setSelection] = useState<SelectionContext[]>([]);
  const runCanvas = useRunCanvas(projectId, project, selection);
  const [draft] = useState(createDraftStore);
  const composerActive = useDraftActive(draft);
  const [source, setSource] = useState<CanvasSource>({ kind: 'live' });
  const [compare, setCompare] = useState<Version[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detailsRunId, setDetailsRunId] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { chatWidth, paneCollapsed } = useUi();
  const [layersHost, setLayersHost] = useState<HTMLDivElement | null>(null);
  const editSession = useRef<EditSessionHandle | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('simple');
  const [actionError, setActionError] = useState<string | null>(null);
  const port = useRef<PreviewPort | null>(null);
  const editControl = useRef<DirectEditControl | null>(null);
  const editable = isDirectEditable(source, compareOpen);
  const panel = usePanelTab(inspectorEmptyReason(selection, editable) === null);

  const direction = project?.directions.find((x) => x.id === directionId) ?? null;
  const designSystem = useDesignSystemState(projectId, project, directionId, data.lastChange);
  const tokens = designSystem.tokens;
  const packActions = usePackActions({ projectId, directionId, setProject: data.setProject, onCommitted: data.refreshVersions });
  const directionRuns = useMemo(
    () =>
      Object.values(runs)
        .filter((r) => r.directionId === directionId)
        .sort((a, b) => a.startedAt - b.startedAt),
    [runs, directionId],
  );
  const activeRun = directionRuns.find((r) => r.status === 'running') ?? null;
  const [pendingRun, setPendingRun] = useState<RunView | null>(null);
  const improveRun = lastImproveRun(directionRuns);
  const variations = useVariations({ projectId, project, direction, setDirectionId: data.setDirectionId, seedRun: data.seedRun });
  const canUndo = undoAllowed(directionId, busy || activeRun !== null, versions.length);
  useDesktopContext({ projectId, directionId, running: activeRun !== null });
  const undoRef = useRef<() => void>(() => undefined);
  const [prefill, setPrefill] = useState<PrefillRequest | null>(null);
  const prefillChat = useRef<(next: CommentPrefill) => void>(() => undefined);
  const onPrefill = useCallback((next: CommentPrefill) => prefillChat.current(next), []);
  const comments = useComments(projectId, directionId, composerActive, activeRun !== null, onPrefill);
  const refreshSelection = useSelectionRefresh(selection, setSelection, comments.describeRef);
  const editHistory = useEditHistory({
    projectId,
    directionId,
    direction,
    versions,
    locked: activeRun !== null,
    before: async () => {
      await editControl.current?.settle();
      refreshSelection(false);
      port.current?.post({ type: 'preview-reset' });
      port.current?.post({ type: 'optimistic-drop' });
    },
    onStepped: () => {
      refreshSelection(true);
      data.refreshVersions();
    },
    onError: setActionError,
  });
  const tweaks = useTweaks({ projectId, project, directionId, lastChange: data.lastChange, onCommitted: () => data.refreshVersions() });
  const historyChain = editHistory.undoChain(canUndo, () => undoRef.current());
  const studioTokens = useStudioTokens({ projectId, directionId, tokens, ...tweaks.undoChain(historyChain.canUndo, historyChain.onUndo), redo: editHistory.redo, onCommitted: () => data.refreshVersions() });
  const { guard } = studioTokens;
  const leaveCheck = studioTokens.draft.confirmLeave;
  useEffect(() => {
    setLeaveCheck(leaveCheck);
    return () => setLeaveCheck(null);
  }, [leaveCheck]);
  const detailsRun = runById(runs, detailsRunId);
  const componentList = useComponents(projectId, directionId, data.lastChange);
  const [mentionRequest, setMentionRequest] = useState<MentionRequest | null>(null);
  const chatState = useChatState(directionRuns);
  const draftChrome = useDraftChrome(projectId, project);

  useHomeVariationsHandoff(projectId, project !== null && direction !== null, variations.propose);

  useEffect(() => {
    if (selection.length > 0) setStaleNotice(null);
  }, [selection.length]);

  useEffect(() => setTelemetryScope(directionId ? { projectId, directionId } : { projectId }), [projectId, directionId]);

  useEffect(() => {
    setSelection([]);
    setStaleNotice(null);
    setSource({ kind: 'live' });
    setCompareOpen(false);
    setMentionRequest(null);
    data.clearErrors();
  }, [directionId]);

  const act = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);
  const { trackSend, ...runControls } = useRunControls(activeRun, draft, act);
  const exporter = useExportTarget(projectId, direction, versions);
  const commandActions = useStudioCommands();
  const tryVariants = useTryVariants(project, selection, variations);
  useEffect(() => {
    const id = window.setTimeout(prefetchCommandLayer, 1500);
    return () => window.clearTimeout(id);
  }, []);
  const rewind = useRewind({ projectId, direction, versions, status, busy, running: activeRun, act, guard, seedRun: data.seedRun, setDirectionId: data.setDirectionId, refreshVersions: data.refreshVersions });
  const mcpFeed = useMcpFeed(projectId, directionId);
  const mcp = useMemo(() => ({ ...mcpFeed, locked: rewind.locked, onUndo: rewind.onRestore }), [mcpFeed, rewind.locked, rewind.onRestore]);

  if (data.loadError || !project) return <StudioBoot message={data.loadError || null} onExit={onExit} />;

  const did = directionId;
  const refreshAfter = (fn: () => Promise<unknown>) =>
    act(async () => {
      await fn();
      data.refreshVersions();
    });

  const withDid = (fn: (id: string) => Promise<unknown>) => {
    if (did) void fn(did);
  };

  const undo = () =>
    withDid(async (id) => {
      await editControl.current?.settle();
      port.current?.post({ type: 'preview-reset' });
      port.current?.post({ type: 'optimistic-drop' });
      setSelection([]);
      return refreshAfter(() => api.undo(projectId, id));
    });
  undoRef.current = undo;

  const showChatAfterRun = () => {
    if ((editSession.current?.count ?? 0) === 0) panel.show('chat');
  };

  const startRun = async (request: RunRequest, optimistic = false) => {
    if (!did) return;
    const pending = optimistic ? emptyRun(`pending-${randomToken()}`, did, Date.now(), request) : null;
    if (pending) {
      setPendingRun(pending);
      showChatAfterRun();
    }
    const cancelSend = data.noteSend();
    try {
      const { runId, stopped } = await trackSend(() => api.startRun(projectId, did, request));
      data.seedRun(runId, did, request, stopped);
    } catch (error) {
      cancelSend();
      throw error;
    } finally {
      if (pending) setPendingRun((current) => (current === pending ? null : current));
    }
    setSource({ kind: 'live' });
    showChatAfterRun();
  };

  const send = (prompt: string, mode: ComposerMode, attachmentIds: string[], level: RunLevel, effort: RunEffort | null, mentions: RunMention[], commentIds: string[] = []) =>
    startRun(withCommentIds(composeRequest({ prompt, mode, attachmentIds, level, effort, mentions, selection, canvas: runCanvas.current() }), commentIds), true);

  const withCanvas = (request: RunRequest): RunRequest => {
    const canvas = runCanvas.current();
    return canvas ? { ...request, canvas } : request;
  };
  const polish = () => void act(() => startRun(withCanvas(POLISH_REQUEST)));
  const tweak = (prompt: string) => void act(() => startRun(composeRequest({ prompt, mode: 'edit', attachmentIds: [], level: project.settings.defaultLevel, effort: null, mentions: [], selection, canvas: runCanvas.current() }), true));
  const suggestTweaks = (prompt?: string) =>
    void act(() => startRun(prompt ? { ...TWEAKS_REQUEST, prompt: `${TWEAKS_REQUEST.prompt}\n\nThe user asked for: ${prompt}` } : TWEAKS_REQUEST));
  const showPane = async (tab: Parameters<typeof panel.choose>[0]): Promise<boolean> => {
    if (paneCollapsed) uiStore.set({ paneCollapsed: false });
    const session = editSession.current;
    if (panel.tab === 'design' && tab !== 'design' && session && !(await session.requestExit())) return false;
    panel.choose(tab);
    return true;
  };
  prefillChat.current = (next) => {
    void showPane('chat').then((shown) => {
      if (shown) setPrefill({ ...next, seq: Date.now() });
    });
  };
  const makeStates = (frame?: CanvasFrame) => {
    const f = frame ?? activeFrame(canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport));
    const path = f.path ?? '';
    void act(() => startRun({ prompt: statesPrompt(path || project.entry), mode: 'edit', level: project.settings.defaultLevel, states: { path, frame: f.id, width: f.width, height: f.height } }, true));
  };
  const approvePlan = (run: RunView) => void act(() => startRun(withCanvas(buildPlanRequest(run))));
  const retryRun = (run: RunView) => {
    const request = run.request;
    if (request) void act(() => startRun({ ...request, retryOf: run.runId }));
  };

  const openShip = shipOpener(project, setShipOpen);
  commandActions.current = {
    running: Boolean(activeRun),
    directions: project.directions.map((d) => ({ id: d.id, name: d.name })),
    directionId: did,
    onHome: guard(onExit),
    onSettings: () => setSettingsOpen(true),
    onDesignMd: () => setDesignOpen(true),
    onPanel: showPane,
    onDirection: guard(data.setDirectionId),
    onStop: runControls.onCancel,
    onPolish: polish,
    onMakeStates: did ? () => makeStates() : null,
    canUndo: historyChain.canUndo,
    onUndo: historyChain.onUndo,
    canRedo: editHistory.redo.enabled,
    onRedo: editHistory.redo.onRedo,
    exportId: exportTarget(versions, direction),
    onExport: (id) => exporter.open({ versionId: id }),
    onShip: openShip,
  };

  const [left, right] = compare.map((picked) => versions.find((v) => v.id === picked.id) ?? picked);


  return (
    <div className="studio" data-pane={paneAttr(paneCollapsed)}>
      <div className="columns" ref={columnsRef} style={chatWidthStyle(chatWidth)}>
        <RunCommentsContext.Provider value={comments}>
        <LeftPane
          collapsed={paneCollapsed}
          columnsRef={columnsRef}
          tab={panel.tab}
          onTab={showPane}
          header={
            <StudioPaneHeader
              name={project.name}
              kindLabel={kindLabel(project)}
              directionName={nameOf(direction)}
              connection={data.connection}
              actionError={actionError}
              onDismissError={() => setActionError(null)}
              tab={panel.tab}
              onTab={showPane}
              hasTokens={studioTokens.panel !== null}
              hasComponents
              hasTweaks
              commentCount={comments.queued.length}
              onRename={(name) => act(async () => data.setProject(await api.renameProject(projectId, name)))}
              onExit={guard(onExit)}
              onDesignMd={() => setDesignOpen(true)}
              onSettings={() => setSettingsOpen(true)}
              onCollapse={() => uiStore.set({ paneCollapsed: true })}
            />
          }
          system={
            <>
              <p className="pane-system-text">The design system sets the tokens, type and components the agent uses for this direction.</p>
              <div className="pane-system-actions">
                <DesignSystemChip system={designSystemRef(projectId, did, project, designSystem.state)} actions={packActions.actions} onOpenDesignMd={() => setDesignOpen(true)} />
                <button type="button" className="btn small" onClick={() => setDesignOpen(true)}>
                  Edit DESIGN.md
                </button>
              </div>
              <RulesSlot projectId={projectId} directionId={did} />
            </>
          }
          chat={{ lead: draftChrome.banner, offline: data.connection === 'reconnecting', onStop: runControls.onCancel, rewind, runs: directionRuns, pending: shownPending(pendingRun, directionRuns, directionId), direction, onDetails: setDetailsRunId, running: activeRun !== null, busy, onPolish: polish, onRetry: retryRun, onApprovePlan: approvePlan, mcp }}
          errors={{ errors: data.errors, onClear: data.clearErrors, onSendToAgent: (e) => draft.set(fixPrompt(e)) }}
          prompt={{
            projectId,
            model: project.settings.model,
            settings: project.settings,
            onSettingsSaved: data.setProject,
            draft,
            queued: comments.queued.length > 0,
            selection,
            onRemoveSelection: (sel) => setSelection((prev) => prev.filter((s) => s.selector !== sel)),
            canvasChip: runCanvas.chip,
            running: activeRun !== null,
            disabled: !did,
            onSend: send,
            prefill,
            ...runControls,
            history: chatState.history,
            contextTokens: chatState.contextTokens,
            directionId: did,
            tokens: tokenEntries(tokens),
            components: componentList.components,
            mentionRequest,
            waitReason: draftChrome.waitReason,
            variations: { count: variations.count, max: variations.max, onCount: variations.setCount, onSend: variations.propose, onElement: tryVariants },
          }}
          inspector={{
            projectId,
            directionId: did,
            selection,
            editable,
            port,
            control: editControl,
            onCommitted: (commit) => {
              setSelection((prev) => mergeCommit(prev, commit));
              port.current?.refreshRects();
            },
            notice: staleNotice,
            tokens: studioTokens.draft.effective,
            onStale: (message) => {
              setStaleNotice(message);
              setSelection([]);
            },
            session: editSession,
            onExit: () => panel.choose('chat'),
            onSessionEnd: (action) => {
              if (action === 'discard') setSelection([]);
              data.refreshVersions();
            },
            layers: <div className="edit-layers-host" ref={setLayersHost} />,
            tweaks: { draft: tweaks, running: activeRun !== null, onSuggest: suggestTweaks },
            selectMode: panel.tab === 'design',
            onSelectMode: () => void runCommand('tool.select'),
            onUndo: () => {
              if (historyChain.canUndo) historyChain.onUndo();
            },
            onRedo: () => {
              if (editHistory.redo.enabled) editHistory.redo.onRedo();
            },
            tab: inspectorTab,
            onTab: setInspectorTab,
            appDir: appDirOf(project),
            onAskAgent: (prompt) => void askAgent(prompt, draft, () => showPane('chat')),
          }}
          details={{ projectId, run: detailsRun, onClose: () => setDetailsRunId(null) }}
          comments={{
            control: comments,
            selection,
            running: activeRun !== null,
            onOpenRun: setDetailsRunId,
            onOpenVersion: (versionId) => {
              const version = versions.find((v) => v.id === versionId);
              if (!version) return;
              setCompareOpen(false);
              setSource({ kind: 'version', versionId, title: version.name ?? version.title });
            },
          }}
          tokens={studioTokens.panel}
          components={{ projectId, directionId: did, list: componentList, active: panel.tab === 'components', kind: project.kind, selection, onMention: (component) => { showPane('chat'); setMentionRequest((prev) => ({ mention: componentMention(component), seq: (prev?.seq ?? 0) + 1 }));
            },
          }}
          todos={chatState.todos}
          tweaks={{ draft: tweaks, running: activeRun !== null, onSuggest: () => suggestTweaks() }}
          versions={{
            project,
            directionId: did,
            versions,
            busy,
            running: activeRun !== null,
            compare: compare.map((v) => v.id),
            openVersionId: source.kind === 'version' ? source.versionId : null,
            onSelectDirection: guard(data.setDirectionId),
            onNewDirection: guard(async (fromVersionId: string, name: string) => {
              const created = await api.createDirection(projectId, fromVersionId, name);
              data.setDirectionId(created.id);
            }),
            onOpen: (v: Version, title: string) => {
              setCompareOpen(false);
              setSource({ kind: 'version', versionId: v.id, title });
            },
            onRestore: (v) => withDid((id) => refreshAfter(() => api.restore(projectId, id, v.id))),
            onUndo: undo,
            onExport: (v) => exporter.open({ versionId: v.id }),
            onToggleCompare: (v) =>
              setCompare((prev) => (prev.some((x) => x.id === v.id) ? prev.filter((x) => x.id !== v.id) : [...prev, v].slice(-2))),
            onCompare: () => setCompareOpen(true),
            onPolish: polish,
            active: panel.tab === 'versions',
            onRename: (v, name) =>
              act(() => renameVersion(projectId, v.id, name).finally(data.refreshVersions)),
          }}
        />
        </RunCommentsContext.Provider>
        <main className="center pane-canvas ui-inset">
          <DraftBar
            project={project}
            state={designSystem.state}
            lastChange={data.lastChange}
            onSave={(name, packId, force) => packActions.actions.onSave(name, packId, false, force)}
            lastRun={improveRun}
            reading={draftChrome.reading}
            running={activeRun !== null}
            improve={<ImproveControl running={draftChrome.locked(activeRun !== null)} run={improveRun} onImprove={(focus) => act(() => startRun(improveRequest(focus, project.settings.defaultLevel)))} />}
          />
          <UnfinishedSlot
            visible={draftChrome.unfinished(Boolean(status?.dirty) && !activeRun)}
            count={status?.changed.length ?? 0}
            busy={busy}
            runStopped={runStoppedUnsaved(directionRuns, versions)}
            onKeep={() => withDid((id) => refreshAfter(async () => {
              await api.keep(projectId, id);
              data.setStatus({ dirty: false, changed: [] });
            }))}
            onDiscard={() => withDid((id) => act(async () => data.setStatus(await api.discard(projectId, id))))}
          />
          <VariationsTop state={variations} project={project} direction={direction} runs={runs} />
          <CenterView
            projectId={projectId}
            kind={project.kind}
            compareOpen={compareOpen}
            left={left}
            right={right}
            versions={versions}
            onCloseCompare={() => setCompareOpen(false)}
            canvas={{
              projectId,
              directionId: did,
              kind: project.kind,
              app: project.app,
              headVersionId: direction?.headVersionId ?? null,
              source,
              onSource: setSource,
              lastChange: data.lastChange,
              selection,
              setSelection,
              onError: data.addError,
              onFrameChange: data.clearFrameErrors,
              port,
              comments,
              commentTools: { tokens: tokenEntries(tokens), components: componentList.components, onSteer: runControls.onSteer },
              running: activeRun !== null,
              runStep: runStepOf(activeRun, direction),
              noRuns: neverRan(data.runsLoaded, directionRuns),
              darkPreview: hasDarkMode(tokens),
              onMakeStates: did ? makeStates : undefined,
              directions: canvasVariations({ state: variations, project, runs, setDirectionId: data.setDirectionId }),
              shell: {
                pane: panel.tab,
                onPane: showPane,
                layersHost: paneCollapsed ? null : layersHost,
                directionName: nameOf(direction),
                paneCollapsed,
                onExpandPane: () => uiStore.set({ paneCollapsed: false }),
                canExport: exporter.canOpen,
                onExport: exporter.openHead,
                onTweak: whenDirection(did, tweak),
                onShip: openShip,
                onShareLink: () => setShareTarget({ projectId, directionId: direction?.id ?? null, versionId: direction?.headVersionId ?? null }),
                onAskAgent: (text) => {
                  draft.set(text);
                  void showPane('chat');
                },
              },
              onTextCommit: (selector, text) => {
                const target = selection.length === 1 ? selection[0] : undefined;
                if (target?.selector === selector && editControl.current?.commitText(selector, text)) return;
                port.current?.post({ type: 'preview-reset' });
              },
            }}
          />
        </main>
      </div>
      <StudioModals
        project={project}
        designOpen={designOpen}
        settingsOpen={settingsOpen}
        onSaved={data.setProject}
        onCloseDesign={() => setDesignOpen(false)}
        onCloseSettings={() => setSettingsOpen(false)}
      />
      <ExportLayer target={exporter.target} onClose={exporter.close} />
      <ShipLayer projectId={projectId} open={shipOpen} onClose={() => setShipOpen(false)} />
      <ShareLayer target={shareTarget} onClose={() => setShareTarget(null)} />
      <StudioToast text={firstText(editHistory.toast, packActions.toast?.text)} />
    </div>
  );
}
