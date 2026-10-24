import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVariations } from '../useVariations';
import { VariationsTop, variationsGrid } from './VariationsLayer';
import type { RunEffort, RunLevel, RunMode, RunRequest, SelectionContext, Version } from '../../shared/contracts';
import { api, errorText } from '../api';
import { downloadBlob } from '../format';
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
import { TWEAKS_REQUEST, useTweaks } from '../useTweaks';
import { useDesktopContext } from '../desktop';
import { useComments } from '../useComments';
import { useRunControls } from '../useRunControls';
import type { RunView } from '../runState';
import { useChatState } from '../useChatState';

function useHomeVariationsHandoff(projectId: string, ready: boolean, propose: ReturnType<typeof useVariations>['propose']): void {
  useEffect(() => {
    if (!ready) return;
    const intent = homeVariations.take(projectId);
    if (intent) void propose(intent.prompt, intent.level, [], intent.count);
  }, [ready, projectId, propose]);
}

function effortOf(effort: RunEffort | null): Pick<RunRequest, 'effort'> {
  return effort ? { effort } : {};
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
  const improveRun = lastImproveRun(directionRuns);
  const variations = useVariations({ projectId, project, direction, setDirectionId: data.setDirectionId, seedRun: data.seedRun });
  const canUndo = undoAllowed(directionId, busy || activeRun !== null, versions.length);
  useDesktopContext({ projectId, directionId, running: activeRun !== null });
  const undoRef = useRef<() => void>(() => undefined);
  const tweaks = useTweaks({ projectId, project, directionId, lastChange: data.lastChange, onCommitted: () => data.refreshVersions() });
  const studioTokens = useStudioTokens({ projectId, directionId, tokens, ...tweaks.undoChain(canUndo, () => undoRef.current()), onCommitted: () => data.refreshVersions() });
  const { guard } = studioTokens;
  const detailsRun = runById(runs, detailsRunId);
  const comments = useComments(projectId, directionId, composerActive);
  const chatState = useChatState(directionRuns);

  useHomeVariationsHandoff(projectId, project !== null && direction !== null, variations.propose);

  useEffect(() => {
    if (selection.length > 0) setStaleNotice(null);
  }, [selection.length]);

  useEffect(() => {
    setSelection([]);
    setStaleNotice(null);
    setSource({ kind: 'live' });
    setCompareOpen(false);
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
  const runControls = useRunControls(activeRun, draft, act);

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

  const startRun = async (request: RunRequest) => {
    if (!did) return;
    const { runId } = await api.startRun(projectId, did, request);
    data.seedRun(runId, did, request);
    setSource({ kind: 'live' });
    panel.show('chat');
  };

  const send = (prompt: string, mode: RunMode, attachmentIds: string[], level: RunLevel, effort: RunEffort | null) =>
    startRun({
      prompt,
      mode,
      level,
      ...effortOf(effort),
      selection: selection.length > 0 ? selection : undefined,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
    });

  const polish = () => void act(() => startRun(POLISH_REQUEST));
  const retryRun = (run: RunView) => {
    const request = run.request;
    if (request) void act(() => startRun({ ...request, retryOf: run.runId }));
  };

  const [left, right] = compare;


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
          <VariationsTop state={variations} project={project} direction={direction} />
          <CenterView
            projectId={projectId}
            kind={project.kind}
            compareOpen={compareOpen}
            left={left}
            right={right}
            onCloseCompare={() => setCompareOpen(false)}
            grid={variationsGrid({ state: variations, project, runs, lastChange: data.lastChange, currentDirectionId: did, setDirectionId: data.setDirectionId, onError: data.addError })}
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
            }}
          />
        </main>
        <RightPanel
          columnsRef={columnsRef}
          tab={panel.tab}
          onTab={panel.choose}
          chat={{ runs: directionRuns, direction, onDetails: setDetailsRunId, running: activeRun !== null, busy, onPolish: polish, onRetry: retryRun }}
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
              setSource({ kind: 'version', versionId, title: version.title });
            },
          }}
          tokens={studioTokens.panel}
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
            onExport: (v) => void act(async () => downloadBlob(await api.exportVersion(projectId, v.id), `${project.name}-${v.id.slice(0, 7)}.zip`)),
            onToggleCompare: (v) =>
              setCompare((prev) => (prev.some((x) => x.id === v.id) ? prev.filter((x) => x.id !== v.id) : [...prev, v].slice(-2))),
            onCompare: () => setCompareOpen(true),
            onPolish: polish,
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
      <StudioToast text={packActions.toast?.text ?? null} />
    </div>
  );
}
