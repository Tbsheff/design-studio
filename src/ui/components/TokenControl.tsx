import { useRef, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { CompiledTokenEntry, DirectStyleProperty } from '../../shared/contracts';
import { modeValue, tokenFieldState, tokensForProperty, type TokenFieldState } from '../../shared/token-match';
import { useAnchoredPopover } from '../useAnchoredPopover';
import type { DirectEdit } from '../useDirectEdit';
import { useTokenUi, type TokenUi } from '../useTokenSnap';
import { Icon } from './Icon';
import { TokenPicker, tokenShortName } from './TokenPicker';

type View = 'picker' | 'menu';

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

function RawMenu(props: { state: Extract<TokenFieldState, { kind: 'raw' }>; onSnap: () => void; onPick: () => void; onCreate: () => void }) {
  const list = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? at + 1 : at - 1;
    items[(next + items.length) % items.length]?.focus();
  };
  const snap = props.state.snap;
  return (
    <div className="tk-menu" role="menu" aria-label="Raw value" ref={list} onKeyDown={onKeyDown}>
      <p className="tk-menu-note">This value is not a design token.</p>
      {snap && (
        <button type="button" role="menuitem" className="tk-item" autoFocus onClick={props.onSnap}>
          <Icon name="magnet" size={13} />
          <span>
            Snap to nearest <code>{snap.cssVar}</code>
          </span>
        </button>
      )}
      <button type="button" role="menuitem" className="tk-item" autoFocus={!snap} onClick={props.onPick}>
        <Icon name="token" size={13} />
        <span>Choose a token…</span>
      </button>
      <button type="button" role="menuitem" className="tk-item" onClick={props.onCreate}>
        <Icon name="plus" size={13} />
        <span>Create token…</span>
      </button>
    </div>
  );
}

function Indicator({ state, ui, label, onOpen }: { state: TokenFieldState; ui: TokenUi; label: string; onOpen: (view: View) => void }) {
  if (state.kind === 'token') {
    const entry = entryFor(ui.entries, state.match.cssVar);
    const color = entry?.type === 'color';
    return (
      <button type="button" className="tk-chip" aria-label={`${label}: token ${state.match.cssVar}`} title={state.match.cssVar} onClick={() => onOpen('picker')}>
        {color && entry && <span className="tk-swatch sm" style={{ background: modeValue(entry, ui.mode) }} aria-hidden="true" />}
        <span className="truncate">{entry ? tokenShortName(entry) : state.match.cssVar}</span>
      </button>
    );
  }
  if (state.kind === 'raw') {
    const hint = state.snap ? `Near ${state.snap.cssVar}` : 'Not a design token';
    return (
      <button type="button" className={`tk-raw ${state.snap ? 'near' : ''}`} aria-label={`${label}: raw value, ${hint.toLowerCase()}`} title={hint} onClick={() => onOpen('menu')}>
        raw
      </button>
    );
  }
  return null;
}

function miniLabel(state: TokenFieldState, label: string): string {
  if (state.kind === 'token') return `${label}: token ${state.match.cssVar}`;
  if (state.kind === 'raw') return `${label}: raw value`;
  return `${label}: choose a token`;
}

function Control({ prop, label, edit, targets, variant = 'field', ui }: ControlProps & { ui: TokenUi }) {
  const pop = useAnchoredPopover<View>();
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

  return (
    <span className={`tk-control ${variant} ${state.kind}`} ref={pop.trigger}>
      {variant === 'field' ? (
        <>
          <Indicator state={state} ui={ui} label={label} onOpen={toggle} />
          <button type="button" className="tk-open" aria-label={`Choose ${label.toLowerCase()} token`} aria-haspopup="listbox" aria-expanded={pop.view === 'picker'} title="Design tokens" onClick={() => toggle('picker')}>
            <Icon name="token" size={12} />
          </button>
        </>
      ) : (
        <button type="button" className="tk-dot" aria-label={miniLabel(state, label)} title={current ?? (state.kind === 'raw' ? 'Raw value' : 'Choose a token')} onClick={() => toggle(state.kind === 'raw' ? 'menu' : 'picker')} />
      )}
      {pop.view &&
        createPortal(
          <div className="tk-pop" ref={pop.panel} style={pop.style} role="dialog" aria-label={`${label} tokens`}>
            {pop.view === 'menu' && state.kind === 'raw' ? (
              <RawMenu
                state={state}
                onSnap={() => state.snap && write(state.snap.cssVar)}
                onPick={() => pop.open('picker')}
                onCreate={() => {
                  pop.close(false);
                  ui.requestCreate({ prop, value, targets: props });
                }}
              />
            ) : (
              <TokenPicker label={label} entries={pool} mode={ui.mode} current={current} nearest={nearest} onChoose={(entry) => write(entry.cssVar)} />
            )}
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
