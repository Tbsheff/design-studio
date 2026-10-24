import { useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { DirectStyleProperty, SelectionContext } from '../../shared/contracts';
import { cssVarFor, varName } from '../../shared/token-match';
import { api } from '../api';
import type { StyleValues } from '../cssValues';
import type { DesignTokens } from '../useDesignSystemState';
import { buildEditRequest, type DirectEdit, type DirectEditCommit } from '../useDirectEdit';
import { snapTarget, useSnapSetting, useTokenSnap, type CreateRequest, type SnapNote, type TokenUi } from '../useTokenSnap';
import { CreateTokenDialog, type CreateTokenSubmit } from './CreateTokenDialog';
import { Icon } from './Icon';
import { TokenControl } from './TokenControl';

interface ScopeInput {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext;
  tokens: DesignTokens | null;
  onCommitted: (commit: DirectEditCommit) => void;
}

export function useInspectorTokens(input: ScopeInput) {
  const [snapOn, setSnap] = useSnapSetting(input.projectId);
  const snap = useTokenSnap(input.tokens, snapOn);
  const [creating, setCreating] = useState<CreateRequest | null>(null);
  const { tokens } = input;
  const ui = useMemo<TokenUi | null>(
    () => (tokens ? { entries: tokens.entries, mode: tokens.mode, snap: snapOn, setSnap, requestCreate: setCreating } : null),
    [tokens, snapOn, setSnap],
  );
  return { ui, snap, creating, closeCreate: useCallback(() => setCreating(null), []) };
}

export function SnapToggle({ ui }: { ui: TokenUi | null }) {
  if (!ui) return null;
  return (
    <button
      type="button"
      className="btn ghost small has-icon tk-snap-toggle"
      aria-pressed={ui.snap}
      title={ui.snap ? 'Values close to a token are written as var(--token)' : 'Values are written as typed'}
      onClick={() => ui.setSnap(!ui.snap)}
    >
      <Icon name="magnet" size={13} />
      Snap to tokens
    </button>
  );
}

function hintFor(edit: DirectEdit, ui: TokenUi): { cssVar: string; props: DirectStyleProperty[] } | null {
  for (const prop of [...edit.dirty].reverse()) {
    const value = edit.values[prop];
    const cssVar = snapTarget(prop, value, ui.entries, ui.mode);
    if (!cssVar) continue;
    const props = edit.dirty.filter((p) => edit.values[p] === value && snapTarget(p, value, ui.entries, ui.mode) === cssVar);
    return { cssVar, props };
  }
  return null;
}

function NoteBar({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="tk-note" role="status">
      <Icon name="magnet" size={13} />
      {children}
      <button type="button" className="icon-btn tk-note-close" aria-label="Dismiss" onClick={onClose}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

export function TokenNotes(props: { ui: TokenUi | null; edit: DirectEdit; note: SnapNote | null; onKeepRaw: (raw: Partial<StyleValues>) => void; onDismiss: () => void }) {
  const { ui, edit, note } = props;
  const [hidden, setHidden] = useState<string | null>(null);
  if (!ui) return null;
  if (note) {
    return (
      <NoteBar onClose={props.onDismiss}>
        <span className="tk-note-text">
          Snapped to <code>{note.cssVar}</code>
        </span>
        <span className="tk-note-sep" aria-hidden="true">·</span>
        <button type="button" className="tk-note-action" onClick={() => props.onKeepRaw(note.raw)}>
          Use raw
        </button>
      </NoteBar>
    );
  }
  const hint = hintFor(edit, ui);
  const key = hint ? `${hint.cssVar}:${hint.props.join(',')}:${edit.values[hint.props[0] ?? 'color']}` : null;
  if (!hint || key === hidden) return null;
  return (
    <NoteBar onClose={() => setHidden(key)}>
      <span className="tk-note-text">
        Close to <code>{hint.cssVar}</code>
      </span>
      <span className="tk-note-sep" aria-hidden="true">·</span>
      <button
        type="button"
        className="tk-note-action"
        onClick={() => {
          edit.preview(Object.fromEntries(hint.props.map((p) => [p, `var(${hint.cssVar})`])));
          edit.commit();
        }}
      >
        Snap to {hint.cssVar}
      </button>
    </NoteBar>
  );
}

export function CreateTokenHost(props: ScopeInput & { edit: DirectEdit; request: CreateRequest | null; onClose: () => void }) {
  const { tokens, request, edit } = props;
  if (!tokens || !request) return null;
  const submit = async (input: CreateTokenSubmit) => {
    if (!props.directionId) throw new Error('No direction selected');
    await edit.drain();
    const cssVar = cssVarFor(input.group, input.name);
    const style: Partial<StyleValues> = Object.fromEntries(request.targets.map((p) => [p, `var(${cssVar})`]));
    const apply = input.apply ? buildEditRequest(props.selection, style) : null;
    const result = await api.createToken(props.projectId, props.directionId, {
      group: input.group,
      name: input.name,
      value: input.value,
      ...(input.darkValue ? { darkValue: input.darkValue } : {}),
      ...(apply ? { apply } : {}),
    });
    tokens.replace(result.state);
    if (apply) {
      edit.absorb(style);
      props.onCommitted({ selector: props.selection.selector, style });
    }
    return result;
  };
  return <CreateTokenDialog request={request} entries={tokens.entries} onSubmit={submit} onClose={props.onClose} />;
}

export function FontField({ ui, edit }: { ui: TokenUi | null; edit: DirectEdit }) {
  const [text, setText] = useState<string | null>(null);
  if (!ui) return null;
  const prop = 'font-family';
  const value = edit.values[prop];
  const settle = () => {
    setText(null);
    edit.commit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      settle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setText(null);
      edit.revert([prop]);
    }
  };
  return (
    <div className="ins-field font">
      <label htmlFor="ins-font-family" className="ins-scrub static">
        Font
      </label>
      <input
        id="ins-font-family"
        className="ins-input"
        aria-label="Font family"
        value={text ?? (varName(value) ? value : value.split(',')[0]?.trim() ?? '')}
        title={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={edit.mixed.has(prop) ? 'Mixed' : '—'}
        onChange={(event) => {
          setText(event.target.value);
          if (event.target.value.trim()) edit.preview({ [prop]: event.target.value.trim() });
        }}
        onKeyDown={onKeyDown}
        onBlur={settle}
      />
      <TokenControl prop={prop} label="Font family" edit={edit} />
    </div>
  );
}
