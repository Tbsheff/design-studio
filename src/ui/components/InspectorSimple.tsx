import { useEffect, useState, type MutableRefObject, type ReactNode } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import type { PreviewPort } from '../bridge';
import type { DesignTokens } from '../useDesignSystemState';
import { useAuthoredCss } from '../useAuthoredCss';
import { useDirectEdits } from '../useDirectEdits';
import { useDirectEdit, type DirectEdit, type DirectEditCommit, type DirectEditControl, type SaveStatus } from '../useDirectEdit';
import { TokenUiContext, type TokenUi } from '../useTokenSnap';
import { BoxModel } from './BoxModel';
import { CopyCodeMenu } from './CopyCodeMenu';
import { Icon } from './Icon';
import { InspectorBreadcrumb } from './InspectorBreadcrumb';
import { RadiusField } from './InspectorCorners';
import { EffectsSection } from './InspectorEffects';
import { AlignField, ColorField, InspectorSection, SelectField } from './InspectorFields';
import { AutoLayoutSection, SizeRows } from './InspectorLayout';
import { MultiCreateTokenHost, MultiNote } from './InspectorMulti';
import { CopyCssButton, InspectorOtherStyles } from './InspectorOtherStyles';
import { ContentRow, CssTextRow, TextStyleToggles } from './InspectorRows';
import { CreateTokenHost, FontField, SnapToggle, TokenLint, TokenNotes, useInspectorTokens } from './InspectorTokens';
import { NumberField } from './NumberField';

export interface EditorProps {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  onStale: (message: string) => void;
  tokens: DesignTokens | null;
}

const WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'];
const CASES = ['none', 'uppercase', 'lowercase', 'capitalize'];
const OVERFLOWS = ['visible', 'hidden', 'clip', 'scroll', 'auto'];
const NEW_BORDER = { 'border-width': '1px', 'border-style': 'solid', 'border-color': '#d0d0d0' };

type Extra = 'shadow' | 'text-shadow' | 'transform' | 'filter';
const EXTRAS: { id: Extra; label: string }[] = [
  { id: 'shadow', label: 'shadow' },
  { id: 'text-shadow', label: 'text shadow' },
  { id: 'transform', label: 'transform' },
  { id: 'filter', label: 'filter' },
];

function isSet(value: string): boolean {
  return value !== '' && value !== 'none' && value !== 'normal';
}

function extrasInUse(edit: DirectEdit): Set<Extra> {
  const used = new Set<Extra>();
  if (isSet(edit.values['box-shadow']) || edit.mixed.has('box-shadow')) used.add('shadow');
  if (isSet(edit.values['text-shadow'])) used.add('text-shadow');
  if (isSet(edit.values.transform)) used.add('transform');
  if (isSet(edit.values.filter)) used.add('filter');
  return used;
}

function hasBorder(edit: DirectEdit): boolean {
  const style = edit.values['border-style'];
  const width = parseFloat(edit.values['border-width']);
  return (style !== '' && style !== 'none' && width > 0) || edit.mixed.has('border-width');
}

function write(edit: DirectEdit, patch: Parameters<DirectEdit['preview']>[0]): void {
  edit.preview(patch);
  edit.commit();
}

function StatusText({ status }: { status: SaveStatus }) {
  if (status.kind === 'saving') return <span className="ins-status saving">Saving…</span>;
  if (status.kind === 'saved') return <span className="ins-status saved">Saved</span>;
  return null;
}

export function ErrorLine({ status }: { status: SaveStatus }) {
  if (status.kind !== 'error') return null;
  return (
    <div className="ins-error" role="alert">
      <Icon name="alert" size={14} />
      <span>{status.message}</span>
    </div>
  );
}

function TextSection({ edit, ui, selection }: { edit: DirectEdit; ui: TokenUi | null; selection: SelectionContext | null }) {
  return (
    <InspectorSection title="Text">
      <div className="ins-grid">
        {selection && <ContentRow selection={selection} edit={edit} />}
        <div className="wide">
          <FontField ui={ui} edit={edit} />
        </div>
        <NumberField short="Size" spec={{ prop: 'font-size', label: 'Font size', edit, min: 0 }} />
        <ColorField prop="color" label="Text color" short="Color" edit={edit} />
        <SelectField prop="font-weight" label="Font weight" short="Weight" edit={edit} options={WEIGHTS} />
        <TextStyleToggles edit={edit} />
        <div className="ins-field ins-align-row">
          <span className="ins-scrub static">Align</span>
          <AlignField edit={edit} />
        </div>
        <NumberField short="Leading" spec={{ prop: 'line-height', label: 'Line height', edit, unit: '', step: 0.1, min: 0 }} />
        <NumberField short="Tracking" spec={{ prop: 'letter-spacing', label: 'Letter spacing', edit, step: 0.1 }} />
        <SelectField prop="text-transform" label="Text case" short="Case" edit={edit} options={CASES} />
      </div>
    </InspectorSection>
  );
}

function AppearanceSection({ edit, extras, onReveal }: { edit: DirectEdit; extras: Set<Extra>; onReveal: (extra: Extra) => void }) {
  const hidden = EXTRAS.filter((extra) => !extras.has(extra.id));
  return (
    <InspectorSection title="Appearance">
      <div className="ins-grid">
        <div className="wide">
          <ColorField prop="background-color" label="Background color" short="Background" edit={edit} />
        </div>
        <RadiusField edit={edit} short="Radius" />
        <SelectField prop="overflow" label="Overflow" short="Overflow" edit={edit} options={OVERFLOWS} />
        <NumberField short="Opacity" spec={{ prop: 'opacity', label: 'Opacity', edit, unit: '', step: 0.05, min: 0, max: 1 }} />
      </div>
      {extras.has('text-shadow') && <CssTextRow prop="text-shadow" label="Text shadow" short="Text shadow" edit={edit} placeholder="0 1px 2px #0003" />}
      {extras.has('transform') && <CssTextRow prop="transform" label="Transform" short="Transform" edit={edit} placeholder="rotate(4deg)" />}
      {extras.has('filter') && <CssTextRow prop="filter" label="Filter" short="Filter" edit={edit} placeholder="blur(4px)" />}
      {hidden.length > 0 && (
        <p className="ins-add-links">
          <span>Add:</span>
          {hidden.map((extra, index) => (
            <span key={extra.id}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              <button type="button" className="ins-add-link" onClick={() => onReveal(extra.id)}>
                {extra.label}
              </button>
            </span>
          ))}
        </p>
      )}
    </InspectorSection>
  );
}

function BorderSection({ edit }: { edit: DirectEdit }) {
  const on = hasBorder(edit);
  const aside = on ? (
    <button type="button" className="icon-btn small" aria-label="Remove border" title="Remove border" onClick={() => write(edit, { 'border-width': '0px', 'border-style': 'none' })}>
      <Icon name="minus" size={14} />
    </button>
  ) : (
    <button type="button" className="ins-add-link" onClick={() => write(edit, NEW_BORDER)}>
      Add border
    </button>
  );
  return (
    <InspectorSection title="Border" aside={aside} className={on ? '' : 'collapsed'}>
      {on && (
        <div className="ins-grid">
          <NumberField short="Width" spec={{ prop: 'border-width', label: 'Border width', edit, min: 0 }} />
          <SelectField prop="border-style" label="Border style" short="Style" edit={edit} options={BORDER_STYLES} />
          <div className="wide">
            <ColorField prop="border-color" label="Border color" short="Color" edit={edit} />
          </div>
        </div>
      )}
    </InspectorSection>
  );
}

function LayoutSection({ edit, selection }: { edit: DirectEdit; selection: SelectionContext | null }) {
  return (
    <AutoLayoutSection edit={edit} title="Layout">
      {selection ? (
        <SizeRows edit={edit} selection={selection} />
      ) : (
        <div className="ins-grid">
          <NumberField short="W" spec={{ prop: 'width', label: 'Width', edit, min: 0 }} />
          <NumberField short="H" spec={{ prop: 'height', label: 'Height', edit, min: 0 }} />
        </div>
      )}
      <BoxModel edit={edit} />
    </AutoLayoutSection>
  );
}

function SimpleSections({ edit, ui, selection }: { edit: DirectEdit; ui: TokenUi | null; selection: SelectionContext | null }) {
  const [revealed, setRevealed] = useState<Set<Extra>>(() => new Set());
  const extras = new Set([...extrasInUse(edit), ...revealed]);
  const reveal = (extra: Extra) => {
    setRevealed((prev) => new Set(prev).add(extra));
    if (extra === 'shadow') write(edit, { 'box-shadow': '0px 2px 8px 0px rgba(0, 0, 0, 0.16)' });
  };
  return (
    <>
      <TextSection edit={edit} ui={ui} selection={selection} />
      <AppearanceSection edit={edit} extras={extras} onReveal={reveal} />
      {extras.has('shadow') && <EffectsSection edit={edit} />}
      <LayoutSection edit={edit} selection={selection} />
      <BorderSection edit={edit} />
    </>
  );
}

function MetaRow({ tag, where, status, ui, onReset, resetDisabled, children }: { tag: string; where: string; status: SaveStatus; ui: TokenUi | null; onReset: () => void; resetDisabled?: boolean; children?: ReactNode }) {
  return (
    <div className="ins-meta">
      <span className="ins-tag">{tag}</span>
      <span className="ins-source" title={where}>
        {where}
      </span>
      <span className="ins-header-end" role="status" aria-live="polite">
        <StatusText status={status} />
      </span>
      <SnapToggle ui={ui} />
      {children}
      <button type="button" className="btn ghost small" onClick={onReset} disabled={resetDisabled}>
        Reset
      </button>
    </div>
  );
}

export function SimpleEditor(props: EditorProps & { target: SelectionContext }) {
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
  const source = props.target.source;
  return (
    <TokenUiContext.Provider value={tk.ui}>
      <div className="inspector ins-simple" aria-label="Design inspector">
        <InspectorBreadcrumb selection={props.target} port={props.port} />
        <MetaRow tag={props.target.tag} where={source ? `${source.file}:${source.line}` : ''} status={edit.status} ui={tk.ui} onReset={edit.reset}>
          <CopyCssButton authored={authored} />
        </MetaRow>
        <div className="ins-scroll">
          <ErrorLine status={edit.status} />
          <TokenLint ui={tk.ui} edit={edit} css={authored.css} />
          <SimpleSections edit={edit} ui={tk.ui} selection={props.target} />
          <InspectorOtherStyles css={authored.css} />
          <div className="ins-export">
            <CopyCodeMenu projectId={props.projectId} directionId={props.directionId} selector={props.target.selector} variant="row" />
          </div>
        </div>
        <TokenNotes ui={tk.ui} note={tk.snap.note} onKeepRaw={keepRaw} onDismiss={tk.snap.dismiss} />
      </div>
      <CreateTokenHost {...scope} edit={edit} request={tk.creating} onClose={tk.closeCreate} />
    </TokenUiContext.Provider>
  );
}

export function SimpleMultiEditor(props: EditorProps) {
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
      <div className="inspector ins-simple" aria-label="Design inspector">
        <MetaRow tag={`${props.selection.length} elements`} where="" status={edit.status} ui={tk.ui} onReset={edit.reset} resetDisabled={edit.blocked !== null} />
        <div className="ins-scroll">
          <MultiNote reason={edit.blocked} />
          <ErrorLine status={edit.status} />
          <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
            <SimpleSections edit={edit} ui={tk.ui} selection={null} />
          </fieldset>
        </div>
        <TokenNotes ui={tk.ui} note={tk.snap.note} onKeepRaw={keepRaw} onDismiss={tk.snap.dismiss} />
      </div>
      <MultiCreateTokenHost projectId={props.projectId} directionId={props.directionId} tokens={props.tokens} edit={edit} request={tk.creating} onClose={tk.closeCreate} />
    </TokenUiContext.Provider>
  );
}
