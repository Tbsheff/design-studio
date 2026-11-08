import { STATE_HINTS } from "@design-studio/contracts/frame-state";
import type {
  FrameStateDef,
  FrameStatesView,
  MockUser,
} from "@design-studio/contracts/frame-state";
import { Icon } from "@design-studio/ui";
import { useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import { copy } from "./copy.js";

import "../../styles/frame-state.css";
import type { setFrameSession } from "./frame-states-model.js";

type MockRules = NonNullable<FrameStateDef["mocks"]>;

type Panel = "list" | "user" | "mock";

const stop = (e: ReactPointerEvent) => e.stopPropagation();

const MOCK_EXAMPLE = '[\n  { "path": "/api/items", "body": [] }\n]';

function menuKeys(event: ReactKeyboardEvent<HTMLElement>): void {
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role^="menuitem"]:not(:disabled)'
    ),
  ];

  const index = items.indexOf(document.activeElement as HTMLButtonElement);

  const next =
    event.key === "ArrowDown"
      ? index + 1
      : event.key === "ArrowUp"
        ? index - 1
        : null;

  if (next === null || items.length === 0) {
    return;
  }
  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
}

function StateRows({
  view,
  chosen,
  onPick,
}: {
  view: FrameStatesView;
  chosen: string;
  onPick: (state: FrameStateDef) => void;
}) {
  return (
    <div className="ui-menu-section">
      <div className="ui-menu-label">Preview state</div>
      {view.states.map((state) => (
        <button
          key={state.id}
          type="button"
          role="menuitemradio"
          aria-checked={state.id === chosen}
          className="ui-menu-item"
          tabIndex={-1}
          data-tip={STATE_HINTS[state.kind]}
          onClick={() => onPick(state)}
        >
          <span>{state.name}</span>
          {state.kind === "mock" && (
            <span className="ui-menu-meta">
              {state.mocks?.length === 1
                ? "1 rule"
                : `${state.mocks?.length ?? 0} rules`}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SessionRows({
  view,
  onPanel,
  onSession,
}: {
  view: FrameStatesView;
  onPanel: (panel: Panel) => void;
  onSession: (change: Parameters<typeof setFrameSession>[1]) => void;
}) {
  const kept = view.session.captured.length;

  return (
    <div className="ui-menu-section">
      <div className="ui-menu-label">Signed-in states use</div>
      {view.session.usesMockUser ? (
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          data-tip={copy.changeTheName}
          onClick={() => onPanel("user")}
        >
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
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          data-tip={`Kept in the studio data folder, never in the repo: ${view.session.captured.join(", ")}`}
          onClick={() => onSession({ forget: true })}
        >
          <Icon name="trash" size={14} />
          <span>Forget kept cookies</span>
          <span className="ui-menu-meta">{kept}</span>
        </button>
      )}
    </div>
  );
}

function UserForm({
  user,
  onSave,
  onBack,
}: {
  user: MockUser;
  onSave: (user: MockUser) => Promise<void>;
  onBack: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="frame-state-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ email, name }).catch((failure: unknown) =>
          setError(failure instanceof Error ? failure.message : String(failure))
        );
      }}
    >
      <label className="frame-page-field">
        <span>Name</span>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="frame-page-field">
        <span>Email</span>
        <input
          value={email}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          onChange={(e) => setEmail(e.target.value)}
        />
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

function MockForm({
  onSave,
  onBack,
}: {
  onSave: (name: string, rules: MockRules) => Promise<void>;
  onBack: () => void;
}) {
  const [name, setName] = useState("Mock data");
  const [rules, setRules] = useState(MOCK_EXAMPLE);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    let parsed: MockRules | null = null;

    try {
      parsed = JSON.parse(rules);
    } catch {
      setError("Rules must be JSON: a list of { path, status?, body? }.");

      return;
    }

    if (!Array.isArray(parsed)) {
      setError("Rules must be a list.");

      return;
    }

    onSave(name, parsed).catch((failure: unknown) =>
      setError(failure instanceof Error ? failure.message : String(failure))
    );
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
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="frame-page-field">
        <span>Answers for calls from the browser</span>
        <textarea
          className="frame-state-rules"
          value={rules}
          spellCheck={false}
          rows={6}
          aria-invalid={Boolean(error)}
          onChange={(e) => setRules(e.target.value)}
        />
      </label>
      <p className="frame-page-hint">
        A path that ends in * matches the start. Calls that match no rule go to
        the app.
      </p>
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

export { MockForm, SessionRows, StateRows, UserForm, menuKeys, stop };

export type { Panel };
