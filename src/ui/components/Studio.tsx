import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVariations } from '../useVariations';
import { VariationsTop, canvasVariations } from './VariationsLayer';
import type { CompiledTokenEntry, RunEffort, RunLevel, RunMention, RunRequest, SelectionContext, Version } from '../../shared/contracts';
import type { ComposerMode } from './RunSettings';
import { api, errorText } from '../api';
import { POLISH_REQUEST } from '../polish';
import { createDraftStore, homeVariations, useDraftActive, useUi } from '../storage';
import { useDesignSystemState } from '../useDesignSystemState';
import { usePackActions } from '../usePackActions';
import { useStudioData } from '../useStudioData';
import type { PreviewPort } from '../bridge';
import { inspectorEmptyReason, isDirectEditable } from './Inspector';
import { usePanelTab } from '../usePanelTab';
import { undoAllowed } from '../useUndoShortcut';
import { mergeCommit, type DirectEditControl } from '../useDirectEdit';
import type { CanvasSource } from './CanvasToolbar';
import { chatWidthStyle } from './ChatSplitter';
import { fixPrompt } from './ErrorsPanel';
import { DraftBar } from './DraftBar';
import { ImproveControl, improveRequest, lastImproveRun } from './DraftImprove';
import { RightPanel } from './RightPanel';
import { designSystemRef } from './DesignSystemChip';
import { StudioTopbar } from './StudioTopbar';
import { CenterView, StudioBoot, StudioModals, StudioToast, UnfinishedSlot } from './StudioParts';
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
import { setTelemetryScope } from '../perfTelemetry';
import { renameVersion } from '../versionsApi';
import { useExportTarget } from '../useExportTarget';
import type { ExportTarget } from '../exportApi';

const ExportDialog = lazy(() => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })));

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
  };
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

function exportTarget(versions: Version[], direction: { headVersionId: string | null } | null): string | null {
  return (versions.find((v) => v.id === direction?.headVersionId) ?? versions[0])?.id ?? null;
}

function runById<T>(runs: Record<string, T>, id: string | null): T | null {
  return id ? (runs[id] ?? null) : null;
}

function neverRan(runsLoaded: boolean, runs: readonly unknown[]): boolean {
  return runsLoaded && runs.length === 0;
}

export function Studio({ projectId, onExit }: { projectId: string; onExit: () => void }) {
  const data = useStudioData(projectId);
  const { project, directionId, versions, runs, status } = data;
  const [selection, setSelection] = useState<SelectionContext[]>([]);
  const [draft] = useState(createDraftStore);
  const composerActive = useDraftActive(draft);
  const [source, setSource] = useState<CanvasSource>({ kind: 'live' });
  const [compare, setCompare] = useState<Version[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detailsRunId, setDetailsRunId] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { chatWidth } = useUi();
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
  const comments = useComments(projectId, directionId, composerActive);
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
  const detailsRun = runById(runs, detailsRunId);
  const componentList = useComponents(projectId, directionId, data.lastChange);
  const [mentionRequest, setMentionRequest] = useState<MentionRequest | null>(null);
  const chatState = useChatState(directionRuns);

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
  useEffect(() => {
    const id = window.setTimeout(prefetchCommandLayer, 1500);
    return () => window.clearTimeout(id);
  }, []);
  const rewind = useRewind({ projectId, direction, versions, status, busy, running: activeRun, act, guard, seedRun: data.seedRun, setDirectionId: data.setDirectionId, refreshVersions: data.refreshVersions });

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
      setSelection([]);
      return refreshAfter(() => api.undo(projectId, id));
    });
  undoRef.current = undo;

  const startRun = async (request: RunRequest, optimistic = false) => {
    if (!did) return;
    const pending = optimistic ? emptyRun(`pending-${randomToken()}`, did, Date.now(), request) : null;
    if (pending) {
      setPendingRun(pending);
      panel.show('chat');
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
    panel.show('chat');
  };

  const send = (prompt: string, mode: ComposerMode, attachmentIds: string[], level: RunLevel, effort: RunEffort | null, mentions: RunMention[]) =>
    startRun(composeRequest({ prompt, mode, attachmentIds, level, effort, mentions, selection }), true);

  const polish = () => void act(() => startRun(POLISH_REQUEST));
  const approvePlan = (run: RunView) => void act(() => startRun(buildPlanRequest(run)));
  const retryRun = (run: RunView) => {
    const request = run.request;
    if (request) void act(() => startRun({ ...request, retryOf: run.runId }));
  };

  commandActions.current = {
    running: Boolean(activeRun),
    directions: project.directions.map((d) => ({ id: d.id, name: d.name })),
    directionId: did,
    onHome: guard(onExit),
    onSettings: () => setSettingsOpen(true),
    onDesignMd: () => setDesignOpen(true),
    onPanel: panel.choose,
    onDirection: guard(data.setDirectionId),
    onStop: runControls.onCancel,
    onPolish: polish,
    canUndo: historyChain.canUndo,
    onUndo: historyChain.onUndo,
    canRedo: editHistory.redo.enabled,
    onRedo: editHistory.redo.onRedo,
    exportId: exportTarget(versions, direction),
    onExport: (id) => exporter.open({ versionId: id }),
  };

  const [left, right] = compare.map((picked) => versions.find((v) => v.id === picked.id) ?? picked);


  return (
    <div className="studio">
      <StudioTopbar
        name={project.name}
        kind={project.kind}
        directionName={direction?.name ?? null}
        designSystem={designSystemRef(projectId, did, project, designSystem.state)}
        designSystemActions={packActions.actions}
        connection={data.connection}
        actionError={actionError}
        onDismissError={() => setActionError(null)}
        onExit={guard(onExit)}
        onDesign={() => setDesignOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        canExport={exporter.canOpen}
        onExport={exporter.openHead}
      />
      <div className="columns" ref={columnsRef} style={chatWidthStyle(chatWidth)}>
        <main className="center">
          <DraftBar
            project={project}
            state={designSystem.state}
            lastChange={data.lastChange}
            onSave={packActions.actions.onSave}
            lastRun={improveRun}
            improve={<ImproveControl running={activeRun !== null} run={improveRun} onImprove={(focus) => act(() => startRun(improveRequest(focus, project.settings.defaultLevel)))} />}
          />
          <UnfinishedSlot
            visible={Boolean(status?.dirty) && !activeRun}
            count={status?.changed.length ?? 0}
            busy={busy}
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
              headVersionId: direction?.headVersionId ?? null,
              source,
              onSource: setSource,
              lastChange: data.lastChange,
              selection,
              setSelection,
              onError: data.addError,
              port,
              comments,
              running: activeRun !== null,
              noRuns: neverRan(data.runsLoaded, directionRuns),
              darkPreview: hasDarkMode(tokens),
              directions: canvasVariations({ state: variations, project, runs, setDirectionId: data.setDirectionId }),
              onTextCommit: (selector, text) => {
                const target = selection.length === 1 ? selection[0] : undefined;
                if (target?.selector === selector && editControl.current?.commitText(selector, text)) return;
                port.current?.post({ type: 'preview-reset' });
              },
            }}
          />
        </main>
        <RightPanel
          columnsRef={columnsRef}
          tab={panel.tab}
          onTab={panel.choose}
          chat={{ rewind, runs: directionRuns, pending: shownPending(pendingRun, directionRuns, directionId), direction, onDetails: setDetailsRunId, running: activeRun !== null, busy, onPolish: polish, onRetry: retryRun, onApprovePlan: approvePlan }}
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
            running: activeRun !== null,
            disabled: !did,
            onSend: send,
            ...runControls,
            history: chatState.history,
            contextTokens: chatState.contextTokens,
            directionId: did,
            tokens: tokenEntries(tokens),
            components: componentList.components,
            mentionRequest,
            variations: { count: variations.count, max: variations.max, onCount: variations.setCount, onSend: variations.propose },
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
          }}
          details={{ projectId, run: detailsRun, onClose: () => setDetailsRunId(null) }}
          comments={{
            control: comments,
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
          components={{ projectId, directionId: did, list: componentList, active: panel.tab === 'components', onMention: (component) => setMentionRequest((prev) => ({ mention: componentMention(component), seq: (prev?.seq ?? 0) + 1 })) }}
          todos={chatState.todos}
          tweaks={{ draft: tweaks, running: activeRun !== null, onSuggest: () => void act(() => startRun(TWEAKS_REQUEST)) }}
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
      <StudioToast text={firstText(editHistory.toast, packActions.toast?.text)} />
    </div>
  );
}
