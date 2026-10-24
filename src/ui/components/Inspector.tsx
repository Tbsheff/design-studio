import { useEffect, type MutableRefObject } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import type { PreviewPort } from '../bridge';
import { textEditability } from '../cssValues';
import type { DesignTokens } from '../useDesignSystemState';
import { useAuthoredCss, type AuthoredCssState } from '../useAuthoredCss';
import { useDirectEdits } from '../useDirectEdits';
import { useDirectEdit, type DirectEdit, type DirectEditCommit, type DirectEditControl, type SaveStatus } from '../useDirectEdit';
import { TokenUiContext, type TokenUi } from '../useTokenSnap';
import { BoxModel } from './BoxModel';
import { Icon } from './Icon';
import { RadiusField } from './InspectorCorners';
import { EffectsSection } from './InspectorEffects';
import { AlignField, ColorField, InspectorSection, SelectField } from './InspectorFields';
import { AutoLayoutSection, SizeSection } from './InspectorLayout';
import { InspectorBreadcrumb } from './InspectorBreadcrumb';
import { CopyCssButton, InspectorOtherStyles } from './InspectorOtherStyles';
import { CreateTokenHost, FontField, SnapToggle, TokenLint, TokenNotes, useInspectorTokens } from './InspectorTokens';
import { MultiCreateTokenHost, MultiNote, MultiSizeSection } from './InspectorMulti';
import { NumberField } from './NumberField';

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
}

const WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'];

export function isDirectEditable(source: { kind: string }, compareOpen: boolean): boolean {
  return source.kind === 'live' && !compareOpen;
}

export function inspectorEmptyReason(selection: SelectionContext[], editable: boolean): string | null {
  if (selection.length === 0) return 'Select an element to edit its style. Press V, then click an element in the preview. Shift-click to add more.';
  if (selection.length === 1 && !selection[0]?.source) return 'This element has no source location. Ask the agent to change it in Chat.';
  if (!editable) return 'Switch the canvas to Live to edit styles directly.';
  return null;
}

function EmptyState({ reason, notice }: { reason: string; notice: string | null }) {
  return (
    <div className="chat-empty ins-empty">
      {notice ? (
        <div className="ins-error" role="alert">
          <Icon name="alert" size={14} />
          <span>{notice}</span>
        </div>
      ) : null}
      <span className="chat-empty-icon" aria-hidden="true">
        <Icon name="pointer" size={18} />
      </span>
      <strong>No element to edit</strong>
      <p>{reason}</p>
    </div>
  );
}

function StatusText({ status }: { status: SaveStatus }) {
  if (status.kind === 'saving') return <span className="ins-status saving">Saving…</span>;
  if (status.kind === 'saved') return <span className="ins-status saved">Saved</span>;
  return null;
}

function Header({ selection, edit, ui, authored }: { selection: SelectionContext; edit: DirectEdit; ui: TokenUi | null; authored: AuthoredCssState }) {
  const source = selection.source;
  const where = source ? `${source.file}:${source.line}` : '';
  return (
    <div className="ins-header">
      <span className="ins-tag">{selection.tag}</span>
      <span className="ins-source" title={where}>
        {where}
      </span>
      <span className="ins-header-end" role="status" aria-live="polite">
        <StatusText status={edit.status} />
      </span>
      <SnapToggle ui={ui} />
      <CopyCssButton authored={authored} />
      <button type="button" className="btn ghost small" onClick={edit.reset}>
        Reset
      </button>
    </div>
  );
}

function TextSection({ selection, edit }: { selection: SelectionContext; edit: DirectEdit }) {
  const state = textEditability(selection);
  return (
    <InspectorSection title="Text">
      {state === 'ok' ? (
        <textarea
          className="ins-text"
          aria-label="Text content"
          rows={2}
          value={edit.text}
          onChange={(event) => edit.previewText(event.target.value)}
          onBlur={edit.commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              edit.commit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              edit.revertText();
            }
          }}
        />
      ) : (
        <p className="ins-note">{state === 'children' ? 'Has child elements' : 'Text is too long to edit here'}</p>
      )}
    </InspectorSection>
  );
}

function TypographySection({ edit, ui }: { edit: DirectEdit; ui: TokenUi | null }) {
  return (
    <InspectorSection title="Typography">
      <FontField ui={ui} edit={edit} />
      <div className="ins-grid">
        <NumberField short="Size" spec={{ prop: 'font-size', label: 'Font size', edit, min: 0 }} />
        <SelectField prop="font-weight" label="Font weight" short="Wt" edit={edit} options={WEIGHTS} />
        <NumberField short="LH" spec={{ prop: 'line-height', label: 'Line height', edit, unit: '', step: 0.1, min: 0 }} />
        <NumberField short="LS" spec={{ prop: 'letter-spacing', label: 'Letter spacing', edit, step: 0.1 }} />
      </div>
      <ColorField prop="color" label="Text color" short="Text" edit={edit} />
      <AlignField edit={edit} />
    </InspectorSection>
  );
}

function FillSection({ edit }: { edit: DirectEdit }) {
  return (
    <InspectorSection title="Fill and border">
      <ColorField prop="background-color" label="Background color" short="Fill" edit={edit} />
      <div className="ins-grid">
        <RadiusField edit={edit} />
        <NumberField short="Op" spec={{ prop: 'opacity', label: 'Opacity', edit, unit: '', step: 0.05, min: 0, max: 1 }} />
        <NumberField short="BW" spec={{ prop: 'border-width', label: 'Border width', edit, min: 0 }} />
        <SelectField prop="border-style" label="Border style" short="Style" edit={edit} options={BORDER_STYLES} />
      </div>
      <ColorField prop="border-color" label="Border color" short="Border" edit={edit} />
    </InspectorSection>
  );
}

function ErrorLine({ status }: { status: SaveStatus }) {
  if (status.kind !== 'error') return null;
  return (
    <div className="ins-error" role="alert">
      <Icon name="alert" size={14} />
      <span>{status.message}</span>
    </div>
  );
}

function Editor(props: InspectorProps & { target: SelectionContext }) {
  const scope = { projectId: props.projectId, directionId: props.directionId, selection: props.target, tokens: props.tokens, onCommitted: props.onCommitted };
  const tk = useInspectorTokens(scope);
  const edit = useDirectEdit({
    projectId: props.projectId,
    directionId: props.directionId,
    selection: props.target,
    port: props.port,
    control: props.control,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    rewrite: tk.ui ? tk.snap.rewrite : undefined,
  });
  const authored = useAuthoredCss(props.port, props.target.selector);
  const savedAt = edit.status.kind === 'saved' ? edit.status.at : 0;
  const refreshAuthored = authored.request;
  useEffect(() => {
    if (savedAt) void refreshAuthored();
  }, [savedAt, refreshAuthored]);
  const keepRaw = (raw: Partial<typeof edit.values>) => {
    tk.snap.keepRaw(raw);
    edit.preview(raw);
    edit.commit();
  };
  return (
    <TokenUiContext.Provider value={tk.ui}>
    <div className="inspector" aria-label="Design inspector">
      <InspectorBreadcrumb selection={props.target} port={props.port} />
      <Header selection={props.target} edit={edit} ui={tk.ui} authored={authored} />
      <div className="ins-scroll">
        <ErrorLine status={edit.status} />
        <TokenLint ui={tk.ui} edit={edit} css={authored.css} />
        <TextSection selection={props.target} edit={edit} />
        <AutoLayoutSection edit={edit} />
        <SizeSection edit={edit} selection={props.target} />
        <InspectorSection title="Spacing">
          <BoxModel edit={edit} />
        </InspectorSection>
        <TypographySection edit={edit} ui={tk.ui} />
        <FillSection edit={edit} />
        <EffectsSection edit={edit} />
        <InspectorOtherStyles css={authored.css} />
      </div>
      <TokenNotes ui={tk.ui} note={tk.snap.note} onKeepRaw={keepRaw} onDismiss={tk.snap.dismiss} />
    </div>
    <CreateTokenHost {...scope} edit={edit} request={tk.creating} onClose={tk.closeCreate} />
    </TokenUiContext.Provider>
  );
}

function MultiEditor(props: InspectorProps) {
  const first = props.selection[0] as SelectionContext;
  const scope = { projectId: props.projectId, directionId: props.directionId, selection: first, tokens: props.tokens, onCommitted: props.onCommitted };
  const tk = useInspectorTokens(scope);
  const edit = useDirectEdits({
    projectId: props.projectId,
    directionId: props.directionId,
    selections: props.selection,
    port: props.port,
    control: props.control,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    rewrite: tk.ui ? tk.snap.rewrite : undefined,
  });
  const keepRaw = (raw: Partial<typeof edit.values>) => {
    tk.snap.keepRaw(raw);
    edit.preview(raw);
    edit.commit();
  };
  return (
    <TokenUiContext.Provider value={tk.ui}>
    <div className="inspector" aria-label="Design inspector">
      <div className="ins-header">
        <span className="ins-tag ins-count">{props.selection.length} elements</span>
        <span className="ins-header-end" role="status" aria-live="polite">
          <StatusText status={edit.status} />
        </span>
        <SnapToggle ui={tk.ui} />
        <button type="button" className="btn ghost small" onClick={edit.reset} disabled={edit.blocked !== null}>
          Reset
        </button>
      </div>
      <div className="ins-scroll">
        <MultiNote reason={edit.blocked} />
        <ErrorLine status={edit.status} />
        <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
          <AutoLayoutSection edit={edit} />
          <MultiSizeSection edit={edit} />
          <InspectorSection title="Spacing">
            <BoxModel edit={edit} />
          </InspectorSection>
          <TypographySection edit={edit} ui={tk.ui} />
          <FillSection edit={edit} />
          <EffectsSection edit={edit} />
        </fieldset>
      </div>
      <TokenNotes ui={tk.ui} note={tk.snap.note} onKeepRaw={keepRaw} onDismiss={tk.snap.dismiss} />
    </div>
    <MultiCreateTokenHost projectId={props.projectId} directionId={props.directionId} tokens={props.tokens} edit={edit} request={tk.creating} onClose={tk.closeCreate} />
    </TokenUiContext.Provider>
  );
}

export function Inspector(props: InspectorProps) {
  const reason = inspectorEmptyReason(props.selection, props.editable);
  const target = props.selection[0];
  if (reason || !target) return <EmptyState reason={reason ?? ''} notice={props.notice} />;
  if (props.selection.length > 1) return <MultiEditor key={props.selection.map((s) => s.selector).join('\n')} {...props} />;
  return <Editor key={target.selector} {...props} target={target} />;
}
