import { Suspense, lazy, useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type MutableRefObject, type ReactNode } from 'react';
import { sharedSourceOf } from '../../shared/app';
import type { EditSessionEnd, SelectionContext } from '../../shared/contracts';
import type { PreviewPort } from '../bridge';
import type { DesignTokens } from '../useDesignSystemState';
import type { DirectEditCommit, DirectEditControl } from '../useDirectEdit';
import { unsavedLabel, useEditSession, type EditSession, type EditSessionHandle, type SessionAction } from '../useEditSession';
import { ComponentsPanel } from './ComponentsPanel';
import { Icon } from './Icon';
import { useElementClasses } from './InspectorClasses';
import { InspectorCode } from './InspectorCode';
import { InspectorAppContext } from './InspectorShared';
import { SimpleEditor, SimpleMultiEditor } from './InspectorSimple';
import { InspectorArrange } from './InspectorArrange';
import { InspectorTools } from './InspectorTools';
import { InspectorTweaks, type InspectorTweaksProps } from './InspectorTweaks';
import { resetEditVariant, useEditVariant } from '../editVariant';
import { imageKindOf } from '../../shared/image';
import { isSvgShapeTag } from '../../shared/vector';
import '../styles/inspector-edit.css';

const InspectorProps = lazy(() => import('./InspectorProps'));
const InspectorImage = lazy(() => import('./InspectorImage'));
const InspectorVector = lazy(() => import('./InspectorVector'));

export type InspectorTab = 'simple' | 'pro' | 'components' | 'code' | 'tweaks';

interface InspectorProps {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  editable: boolean;
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  notice: string | null;
  onStale: (message: string) => void;
  tokens: DesignTokens | null;
  session?: MutableRefObject<EditSessionHandle | null>;
  onExit?: () => void;
  onSessionEnd?: (action: SessionAction, result: EditSessionEnd) => void;
  layers?: ReactNode;
  tweaks?: InspectorTweaksProps;
  selectMode?: boolean;
  onSelectMode?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  tab?: InspectorTab;
  onTab?: (tab: InspectorTab) => void;
  appDir?: string | null;
  onAskAgent?: (prompt: string) => void;
  components?: ComponentProps<typeof ComponentsPanel>;
}

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'simple', label: 'Simple' },
  { id: 'pro', label: 'Layers' },
  { id: 'components', label: 'Components' },
  { id: 'code', label: 'Code' },
  { id: 'tweaks', label: 'Tweaks' },
];

const EMPTY_HINT = 'Click any element on the canvas to edit it. Shift-click to select more.';

export function isDirectEditable(source: { kind: string }, compareOpen: boolean): boolean {
  return source.kind === 'live' && !compareOpen;
}

export function inspectorEmptyReason(selection: SelectionContext[], editable: boolean): string | null {
  if (selection.length === 0) return EMPTY_HINT;
  if (selection.length === 1 && !selection[0]?.source) return 'This element has no source location. Ask the agent to change it in Chat.';
  if (!editable) return 'Switch the canvas to Live to edit styles directly.';
  return null;
}

function EmptyState({ reason, notice }: { reason: string; notice: string | null }) {
  return (
    <div className="ins-empty">
      {notice ? (
        <div className="ins-error" role="alert">
          <Icon name="alert" size={14} />
          <span>{notice}</span>
        </div>
      ) : null}
      <p className="ins-hint">{reason}</p>
    </div>
  );
}

function SessionHeader({ session, onDone }: { session: EditSession; onDone: (action: SessionAction) => void }) {
  const blockedDiscard = session.blocked !== null;
  const run = async (action: SessionAction) => {
    if (await (action === 'save' ? session.save() : session.discard())) onDone(action);
  };
  return (
    <div className="edit-head">
      <h2 className="edit-title">Edit</h2>
      {session.dirty && session.count > 0 && (
        <span className="edit-count" role="status" data-tip={unsavedLabel(session.count)}>
          {session.count}
          <span className="sr-only"> unsaved edits</span>
        </span>
      )}
      <span className="edit-head-end" />
      <button
        type="button"
        className="btn ghost small"
        disabled={session.busy !== null || session.count === 0 || blockedDiscard}
        data-tip={blockedDiscard ? (session.blocked ?? undefined) : 'Undo every edit since you entered Edit mode'}
        data-tip-align="end"
        onClick={() => void run('discard')}
      >
        {session.busy === 'discard' ? 'Discarding…' : 'Discard'}
      </button>
      <button type="button" className="btn small primary" disabled={session.busy !== null} data-tip="Keep the edits as one version" data-tip-align="end" onClick={() => void run('save')}>
        {session.busy === 'save' ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function LeavePrompt({ session }: { session: EditSession }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (session.asking) first.current?.focus();
  }, [session.asking]);
  if (!session.asking) return null;
  return (
    <div className="edit-leave" role="alertdialog" aria-modal="false" aria-labelledby="edit-leave-title" onKeyDown={(event) => event.key === 'Escape' && void session.answer('cancel')}>
      <p id="edit-leave-title" className="edit-leave-title">
        Save your edits?
      </p>
      <p className="edit-leave-text">You have {unsavedLabel(session.count).toLowerCase()}. Save keeps them as one version. Discard removes them.</p>
      {session.error && <p className="edit-leave-error">{session.error}</p>}
      <div className="edit-leave-actions">
        <button type="button" className="btn ghost small" onClick={() => void session.answer('cancel')}>
          Cancel
        </button>
        <button type="button" className="btn small" disabled={session.busy !== null || session.blocked !== null} onClick={() => void session.answer('discard')}>
          Discard
        </button>
        <button ref={first} type="button" className="btn small primary" disabled={session.busy !== null} onClick={() => void session.answer('save')}>
          Save
        </button>
      </div>
    </div>
  );
}

function Tabs({ tab, onTab }: { tab: InspectorTab; onTab: (tab: InspectorTab) => void }) {
  const refs = useRef<Partial<Record<InspectorTab, HTMLButtonElement | null>>>({});
  const onKeyDown = (event: KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);
    const target = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: TABS.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length]?.id ?? 'simple';
    onTab(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="edit-tabs" role="tablist" aria-label="Edit mode" onKeyDown={onKeyDown}>
      {TABS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={`edit-tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`edit-pane-${t.id}`}
          tabIndex={tab === t.id ? 0 : -1}
          className={`edit-tab ${tab === t.id ? 'on' : ''}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ComponentSection(props: InspectorProps) {
  const target = props.selection[0];
  if (props.selection.length !== 1 || !target || !props.directionId || (!target.owners?.length && !target.usedAt)) return null;
  return (
    <Suspense fallback={null}>
      <InspectorProps key={target.selector} projectId={props.projectId} directionId={props.directionId} selection={target} editable={props.editable} />
    </Suspense>
  );
}

function ImageSection(props: InspectorProps) {
  const target = props.selection[0];
  if (props.selection.length !== 1 || !target || !props.directionId || !imageKindOf(target)) return null;
  return (
    <Suspense fallback={null}>
      <InspectorImage key={target.selector} projectId={props.projectId} directionId={props.directionId} selection={target} editable={props.editable} port={props.port} />
    </Suspense>
  );
}

function useUseSite(props: InspectorProps) {
  const [componentFor, setComponentFor] = useState<string | null>(null);
  const target = props.selection.length === 1 ? props.selection[0] : undefined;
  const shared = target && props.appDir ? sharedSourceOf(target, props.appDir) : null;
  const use = shared?.use && shared.name ? { source: shared.use, component: shared.name } : null;
  const component = useElementClasses(props.projectId, props.directionId, use ? (target?.source ?? null) : null, 0);
  const editingUse = Boolean(use) && component.element?.forwardsClassName !== false && componentFor !== target?.selector;
  const effective = target && use && editingUse ? { ...target, ...use, usedAt: null } : target;
  const toggle = () => setComponentFor(editingUse ? (target?.selector ?? null) : null);
  return { editingUse, effective, sharedEditing: shared ? { shared, editingUse, onToggle: toggle } : null };
}

function SimpleTab(props: InspectorProps) {
  const variant = useEditVariant();
  const site = useUseSite(props);
  const reason = inspectorEmptyReason(props.selection, props.editable);
  const target = props.selection[0];
  if (reason && target && props.editable && props.selection.length === 1 && imageKindOf(target)) {
    return (
      <div className="inspector ins-simple">
        <div className="ins-scroll">
          <ImageSection {...props} />
          <EmptyState reason="The other styles of this image come from a component outside the project. Ask the agent to change them in Chat." notice={props.notice} />
        </div>
      </div>
    );
  }
  if (reason || !target) return <EmptyState reason={reason ?? ''} notice={props.notice} />;
  if (props.selection.length > 1) return <SimpleMultiEditor key={props.selection.map((s) => s.selector).join('\n')} {...props} />;
  return (
    <SimpleEditor key={`${target.selector}|${variant}${site.editingUse ? '|use' : ''}`} {...props} target={site.effective ?? target} sharedEditing={site.sharedEditing} component={
        <>
          <ImageSection {...props} />
          <ComponentSection {...props} />
        </>
      }
    />
  );
}

function vectorShown(selection: SelectionContext[]): boolean {
  return selection.length > 0 && selection.length <= 2 && selection.every((item) => isSvgShapeTag(item.tag));
}

function ProTab(props: InspectorProps) {
  return (
    <div className="edit-pro">
      <div className="edit-pro-layers">{props.layers ?? <p className="ins-hint">Layers show for the live preview. Press ⌥1 to open them on the canvas.</p>}</div>
      {props.selection.length === 0 && <p className="ins-hint">{EMPTY_HINT}</p>}
    </div>
  );
}

function ComponentsTab({ components }: { components: InspectorProps['components'] }) {
  if (!components) return <p className="ins-hint edit-tab-empty">Components show for projects with a component list.</p>;
  return (
    <div className="edit-components">
      <ComponentsPanel {...components} active />
    </div>
  );
}

function useSessionHandle(ref: MutableRefObject<EditSessionHandle | null> | undefined, session: EditSession) {
  useEffect(() => {
    if (!ref) return;
    ref.current = { dirty: session.dirty, count: session.count, requestExit: session.requestExit, save: session.save, discard: session.discard };
  });
  useEffect(
    () => () => {
      if (ref) ref.current = null;
    },
    [ref],
  );
}

export function Inspector(props: InspectorProps) {
  const [ownTab, setOwnTab] = useState<InspectorTab>('simple');
  const tab = props.tab ?? ownTab;
  const onTab = props.onTab ?? setOwnTab;
  const session = useEditSession({
    projectId: props.projectId,
    directionId: props.directionId,
    control: props.control,
    port: props.port,
    onEnded: (action, result) => {
      if (props.onSessionEnd) props.onSessionEnd(action, result);
      else if (action === 'discard' && props.selection.length > 0) props.onStale('');
    },
  });
  useSessionHandle(props.session, session);
  const port = props.port;
  useEffect(() => () => resetEditVariant(port.current), [port]);
  return (
    <InspectorAppContext.Provider value={{ appDir: props.appDir ?? null, ask: props.onAskAgent ?? null, element: null }}>
      <div className="edit-pane" aria-label="Edit">
        <SessionHeader session={session} onDone={() => props.onExit?.()} />
        {session.error && !session.asking && (
          <div className="ins-error" role="alert">
            <Icon name="alert" size={14} />
            <span>{session.error}</span>
            <button type="button" className="icon-btn small" aria-label="Dismiss" onClick={session.clearError}>
              <Icon name="close" size={12} />
            </button>
          </div>
        )}
        <LeavePrompt session={session} />
        <Tabs tab={tab} onTab={onTab} />
        {(tab === 'simple' || tab === 'pro') && <InspectorTools {...props} />}
        <InspectorArrange {...props} showBar={tab === 'simple'} />
        {tab === 'simple' && vectorShown(props.selection) && (
          <Suspense fallback={null}>
            <InspectorVector projectId={props.projectId} directionId={props.directionId} selection={props.selection} editable={props.editable} />
          </Suspense>
        )}
        <div className="edit-body" role="tabpanel" id={`edit-pane-${tab}`} aria-labelledby={`edit-tab-${tab}`}>
          {tab === 'simple' && <SimpleTab {...props} />}
          {tab === 'pro' && <ProTab {...props} />}
          {tab === 'components' && <ComponentsTab components={props.components} />}
          {tab === 'code' && <InspectorCode projectId={props.projectId} directionId={props.directionId} selection={props.selection.at(-1) ?? null} />}
          {tab === 'tweaks' && (
            <>
              {props.tweaks && session.count > 0 && <p className="ins-note edit-tweaks-note">Save or discard your edits before you ask for a tweaks panel.</p>}
              <InspectorTweaks tweaks={props.tweaks} blocked={session.count > 0} />
            </>
          )}
        </div>
      </div>
    </InspectorAppContext.Provider>
  );
}
