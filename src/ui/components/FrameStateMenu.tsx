import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { STATE_HINTS, type FrameStateDef, type FrameStatesView, type MockUser } from '../../shared/frame-state';
import { frameStateOf, setFrameSession, setFrameState, useCurrentFrameStates } from '../frameStates';
import { usePopover } from '../usePopover';
import { Icon } from './Icon';
import '../styles/frame-state.css';

type Panel = 'list' | 'user' | 'mock';

const stop = (e: ReactPointerEvent) => e.stopPropagation();

const MOCK_EXAMPLE = '[\n  { "path": "/api/items", "body": [] }\n]';

function menuKeys(event: ReactKeyboardEvent<HTMLElement>): void {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)'));
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : null;
  if (next === null || items.length === 0) return;
  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
}

function StateRows({ view, chosen, onPick }: { view: FrameStatesView; chosen: string; onPick: (state: FrameStateDef) => void }) {
  return (
    <div className="ui-menu-section">
      <div className="ui-menu-label">Preview state</div>
      {view.states.map((state) => (
        <button key={state.id} type="button" role="menuitemradio" aria-checked={state.id === chosen} className="ui-menu-item" tabIndex={-1} data-tip={STATE_HINTS[state.kind]} onClick={() => onPick(state)}>
          <span>{state.name}</span>
          {state.kind === 'mock' && <span className="ui-menu-meta">{state.mocks?.length === 1 ? '1 rule' : `${state.mocks?.length ?? 0} rules`}</span>}
        </button>
      ))}
    </div>
  );
}

function SessionRows({ view, onPanel, onSession }: { view: FrameStatesView; onPanel: (panel: Panel) => void; onSession: (change: Parameters<typeof setFrameSession>[1]) => void }) {
  const kept = view.session.captured.length;
  return (
    <div className="ui-menu-section">
      <div className="ui-menu-label">Signed-in states use</div>
      {view.session.usesMockUser ? (
        <button type="button" role="menuitem" className="ui-menu-item" tabIndex={-1} data-tip="Change the name and email of the mock user" onClick={() => onPanel('user')}>
          <Icon name="edit" size={14} />
          <span className="frame-state-user">{view.session.user.email}</span>
        </button>
      ) : (
        <div className="frame-state-line">
          <Icon name="lock" size={14} />
          <span>A real sign-in from a signed-in frame</span>
        </div>
      )}
      {kept > 0 && (
        <button type="button" role="menuitem" className="ui-menu-item" tabIndex={-1} data-tip={`Kept in the studio data folder, never in the repo: ${view.session.captured.join(', ')}`} onClick={() => onSession({ forget: true })}>
          <Icon name="trash" size={14} />
          <span>Forget kept cookies</span>
          <span className="ui-menu-meta">{kept}</span>
        </button>
      )}
    </div>
  );
}

function UserForm({ user, onSave, onBack }: { user: MockUser; onSave: (user: MockUser) => Promise<void>; onBack: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="frame-state-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, email }).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
      }}
    >
      <label className="frame-page-field">
        <span>Name</span>
        <input value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="frame-page-field">
        <span>Email</span>
        <input value={email} spellCheck={false} aria-invalid={Boolean(error)} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn small strong">
          Save
        </button>
      </div>
    </form>
  );
}

function MockForm({ onSave, onBack }: { onSave: (name: string, rules: unknown[]) => Promise<void>; onBack: () => void }) {
  const [name, setName] = useState('Mock data');
  const [rules, setRules] = useState(MOCK_EXAMPLE);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rules);
    } catch {
      setError('Rules must be JSON: a list of { path, status?, body? }.');
      return;
    }
    if (!Array.isArray(parsed)) {
      setError('Rules must be a list.');
      return;
    }
    onSave(name, parsed).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };
  return (
    <form
      className="frame-state-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="frame-page-field">
        <span>Name</span>
        <input value={name} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="frame-page-field">
        <span>Answers for calls from the browser</span>
        <textarea className="frame-state-rules" value={rules} spellCheck={false} rows={6} aria-invalid={Boolean(error)} onChange={(e) => setRules(e.target.value)} />
      </label>
      <p className="frame-page-hint">A path that ends in * matches the start. Calls that match no rule go to the app.</p>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn small strong">
          Show in this frame
        </button>
      </div>
    </form>
  );
}

function usePanelMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('list');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setPanel('list');
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  useEffect(() => {
    if (open && panel === 'list') root.current?.querySelector<HTMLButtonElement>('[role^="menuitem"][aria-checked="true"]')?.focus();
  }, [open, panel]);
  return { open, setOpen, panel, setPanel, root, trigger, close };
}

function MenuBody({ projectId, frameId, view, chosen, menu, onError }: { projectId: string; frameId: string; view: FrameStatesView; chosen: string; menu: ReturnType<typeof usePanelMenu>; onError: (message: string | null) => void }) {
  const run = (task: Promise<unknown>) => {
    onError(null);
    task.then(() => menu.close(true)).catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
  };
  if (menu.panel === 'user') return <UserForm user={view.session.user} onBack={() => menu.setPanel('list')} onSave={(user) => setFrameSession(projectId, { user }).then(() => menu.close(true))} />;
  if (menu.panel === 'mock') return <MockForm onBack={() => menu.setPanel('list')} onSave={(name, rules) => setFrameState(projectId, frameId, 'mock', { name, rules }).then(() => menu.close(true))} />;
  return (
    <div role="menu" aria-label="Frame state" onKeyDown={menuKeys}>
      <StateRows view={view} chosen={chosen} onPick={(state) => run(setFrameState(projectId, frameId, state.id))} />
      <div className="ui-menu-section">
        <button type="button" role="menuitem" className="ui-menu-item" tabIndex={-1} onClick={() => menu.setPanel('mock')}>
          <Icon name="plus" size={14} />
          <span>New mock data…</span>
        </button>
      </div>
      <SessionRows view={view} onPanel={menu.setPanel} onSession={(change) => run(setFrameSession(projectId, change))} />
      <p className="frame-state-note">To sign in for real, sign in inside a signed-in frame. The proxy changes only calls from the browser. Data the app loads on the server can read the x-studio-state header.</p>
    </div>
  );
}

export function FrameStateMenu({ frameId, frameName }: { frameId: string; frameName: string }) {
  const states = useCurrentFrameStates();
  const menu = usePanelMenu();
  const [error, setError] = useState<string | null>(null);
  if (!states) return null;
  const chosen = frameStateOf(states.view, frameId);
  const def = states.view.states.find((state) => state.id === chosen);
  const set = chosen !== 'default';
  return (
    <div className="frame-menu-root frame-state-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className={`frame-chip state${set ? ' set' : ''}`}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`Preview state for ${frameName}: ${def?.name ?? chosen}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={menu.open ? undefined : 'Preview state: signed in, empty, loading, error or mock data'}
      >
        <Icon name="sliders" size={12} />
        {set && <span className="frame-state-name">{def?.name ?? chosen}</span>}
      </button>
      {menu.open && (
        <div className="ui-menu project-menu canvas-menu frame-menu frame-state-menu" onKeyDown={(e) => e.stopPropagation()}>
          <MenuBody projectId={states.projectId} frameId={frameId} view={states.view} chosen={chosen} menu={menu} onError={setError} />
          {error && <p className="frame-page-hint error">{error}</p>}
        </div>
      )}
    </div>
  );
}
