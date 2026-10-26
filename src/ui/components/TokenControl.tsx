import { useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { CompiledTokenEntry, DirectStyleProperty } from '../../shared/contracts';
import { modeValue, tokenFieldState, tokensForProperty, type TokenFieldState } from '../../shared/token-match';
import { useAnchoredPopover } from '../useAnchoredPopover';
import type { DirectEdit } from '../useDirectEdit';
import { useTokenUi, type TokenUi } from '../useTokenSnap';
import { Icon } from './Icon';
import { TokenPicker, tokenShortName } from './TokenPicker';

type View = 'picker';

interface ControlProps {
  prop: DirectStyleProperty;
  label: string;
  edit: DirectEdit;
  targets?: DirectStyleProperty[];
  variant?: 'field' | 'mini';
}

function entryFor(entries: CompiledTokenEntry[], cssVar: string | undefined): CompiledTokenEntry | undefined {
  return entries.find((entry) => entry.cssVar === cssVar);
}

function RawMenu({ state, onSnap, onCreate }: { state: Extract<TokenFieldState, { kind: 'raw' }>; onSnap: () => void; onCreate: () => void }) {
  const list = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? at + 1 : at - 1;
    items[(next + items.length) % items.length]?.focus();
  };
  const snap = state.snap;
  return (
    <div className="tk-menu" role="menu" aria-label="Raw value" ref={list} onKeyDown={onKeyDown}>
      <p className="tk-menu-note">{snap ? 'This value is near a design token.' : 'This value is not a design token.'}</p>
      {snap && (
        <button type="button" role="menuitem" className="tk-item" onClick={onSnap}>
          <Icon name="magnet" size={16} />
          <span>
            Snap to <code>{snap.cssVar}</code>
          </span>
        </button>
      )}
      <button type="button" role="menuitem" className="tk-item" onClick={onCreate}>
        <Icon name="plus" size={16} />
        <span>Create token…</span>
      </button>
    </div>
  );
}

function stateTip(state: TokenFieldState, name: string | null): string {
  if (state.kind === 'token') return name ?? state.match.cssVar;
  if (state.kind === 'raw') return state.snap ? `Raw value, near ${state.snap.cssVar}` : 'Raw value, not a design token';
  return 'Design tokens';
}

function miniLabel(state: TokenFieldState, label: string): string {
  if (state.kind === 'token') return `${label}: token ${state.match.cssVar}`;
  if (state.kind === 'raw') return `${label}: raw value`;
  return `${label}: choose a token`;
}

function FieldButton({ state, ui, label, expanded, onClick }: { state: TokenFieldState; ui: TokenUi; label: string; expanded: boolean; onClick: () => void }) {
  const current = state.kind === 'token' ? state.match.cssVar : null;
  const entry = current ? entryFor(ui.entries, current) : undefined;
  const name = current ? (entry ? tokenShortName(entry) : current) : null;
  return (
    <button
      type="button"
      className="tk-open"
      aria-label={current ? `${label}: token ${current}` : `Choose ${label.toLowerCase()} token`}
      aria-description={state.kind === 'raw' ? stateTip(state, null) : undefined}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      data-tip={stateTip(state, current)}
      data-tip-align="end"
      onClick={onClick}
    >
      {name && (
        <span className="tk-name-chip">
          {entry?.type === 'color' && <span className="tk-swatch sm" style={{ background: modeValue(entry, ui.mode) }} aria-hidden="true" />}
          <span className="truncate">{name}</span>
        </span>
      )}
      <Icon name="token" size={12} />
    </button>
  );
}

const fieldAnchor = (trigger: HTMLElement): HTMLElement => trigger.closest<HTMLElement>('.ins-field, .side-cell') ?? trigger;

function Control({ prop, label, edit, targets, variant = 'field', ui }: ControlProps & { ui: TokenUi }) {
  const pop = useAnchoredPopover<View>(fieldAnchor);
  const value = edit.values[prop];
  const state = tokenFieldState(prop, value, ui.entries, ui.mode);
  const pool = tokensForProperty(prop, ui.entries);
  const props = targets ?? [prop];

  const write = (cssVar: string) => {
    pop.close(true);
    edit.preview(Object.fromEntries(props.map((p) => [p, `var(${cssVar})`])));
    edit.commit();
  };
  const toggle = (view: View) => (pop.view === view ? pop.close(false) : pop.open(view));
  const current = state.kind === 'token' ? state.match.cssVar : null;
  const nearest = state.kind === 'raw' ? (state.nearest?.cssVar ?? null) : null;
  const near = state.kind === 'raw' && state.snap ? 'near' : '';
  const create = () => {
    pop.close(false);
    ui.requestCreate({ prop, value, targets: props });
  };

  return (
    <span className={`tk-control ${variant} ${state.kind} ${near}`} ref={pop.trigger}>
      {variant === 'field' ? (
        <FieldButton state={state} ui={ui} label={label} expanded={pop.view === 'picker'} onClick={() => toggle('picker')} />
      ) : (
        <button type="button" className="tk-dot" aria-label={miniLabel(state, label)} data-tip={current ?? (state.kind === 'raw' ? 'Raw value' : 'Choose a token')} onClick={() => toggle('picker')} />
      )}
      {pop.view &&
        createPortal(
          <div className="tk-pop" ref={pop.panel} style={pop.style} role="dialog" aria-label={`${label} tokens`}>
            {state.kind === 'raw' && <RawMenu state={state} onSnap={() => state.snap && write(state.snap.cssVar)} onCreate={create} />}
            <TokenPicker label={label} entries={pool} mode={ui.mode} current={current} nearest={nearest} onChoose={(choice) => write(choice.cssVar)} />
          </div>,
          document.body,
        )}
    </span>
  );
}

export function TokenControl(props: ControlProps) {
  const ui = useTokenUi();
  if (!ui || tokensForProperty(props.prop, ui.entries).length === 0) return null;
  return <Control {...props} ui={ui} />;
}
