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
  ReactElement,
  ReactNode,
} from "react";

import { copy } from "./copy.js";

import "../../styles/frame-state.css";
import type { setFrameSession } from "./frame-states-model.js";
import { runOrReport } from "./settle-model.js";

const INDEX_1 = 1;

const LENGTH_0 = 0;

const LENGTH_1 = 1;

const KEPT_0 = 0;

type MockRules = NonNullable<FrameStateDef["mocks"]>;

type Panel = "list" | "user" | "mock";

const stop = (eventValue: ReactPointerEvent): void =>
  eventValue.stopPropagation();

const MOCK_EXAMPLE = '[\n  { "path": "/api/items", "body": [] }\n]';

const menuKeys = (event: ReactKeyboardEvent<HTMLElement>): void => {
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role^="menuitem"]:not(:disabled)'
    ),
  ];

  const index = items.indexOf(document.activeElement as HTMLButtonElement);

  const next: number | null = ((): number | null => {
    if (event.key === "ArrowDown") {
      return index + INDEX_1;
    }
    if (event.key === "ArrowUp") {
      return index - INDEX_1;
    }
    return null;
  })();

  if (next === null || items.length === LENGTH_0) {
    return;
  }

  event.preventDefault();
  items[(next + items.length) % items.length]?.focus();
};

const StateRows = ({
  view,
  chosen,
  onPick,
}: {
  view: FrameStatesView;
  chosen: string;
  onPick: (state: FrameStateDef) => void;
}): ReactElement => (
  <div className="ui-menu-section">
    <div className="ui-menu-label">{copy.previewState}</div>
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
            {state.mocks?.length === LENGTH_1
              ? "1 rule"
              : `${state.mocks?.length ?? LENGTH_0} rules`}
          </span>
        )}
      </button>
    ))}
  </div>
);

const SessionRows = ({
  view,
  onPanel,
  onSession,
}: {
  view: FrameStatesView;
  onPanel: (panel: Panel) => void;
  onSession: (change: Parameters<typeof setFrameSession>[1]) => void;
}): ReactElement => {
  const kept = view.session.captured.length;

  let content: ReactNode = (
    <div className="frame-state-line">
      <Icon name="lock" size={14} />
      <span>{copy.aRealSignIn}</span>
    </div>
  );

  if (view.session.usesMockUser) {
    content = (
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
    );
  }

  return (
    <div className="ui-menu-section">
      <div className="ui-menu-label">{copy.signedInStatesUse}</div>
      {content}
      {kept > KEPT_0 && (
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          data-tip={`Kept in the studio data folder, never in the repo: ${view.session.captured.join(", ")}`}
          onClick={() => onSession({ forget: true })}
        >
          <Icon name="trash" size={14} />
          <span>{copy.forgetKeptCookies}</span>
          <span className="ui-menu-meta">{kept}</span>
        </button>
      )}
    </div>
  );
};

const UserForm = ({
  user,
  onSave,
  onBack,
}: {
  user: MockUser;
  onSave: (user: MockUser) => Promise<void>;
  onBack: () => void;
}): ReactElement => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="frame-state-form"
      onSubmit={(event3) => {
        event3.preventDefault();
        void runOrReport(onSave({ email, name }), (failure) => {
          let argument: string = failure.message;

          if (!(failure instanceof Error)) {
            argument = String(failure);
          }

          return setError(argument);
        });
      }}
    >
      <label className="frame-page-field">
        <span>{copy.name}</span>
        <input
          value={name}
          autoFocus
          onChange={(event4) => setName(event4.target.value)}
        />
      </label>
      <label className="frame-page-field">
        <span>{copy.email}</span>
        <input
          value={email}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          onChange={(event5) => setEmail(event5.target.value)}
        />
      </label>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          {copy.back}
        </button>
        <button type="submit" className="btn small strong">
          {copy.save}
        </button>
      </div>
    </form>
  );
};

const MockForm = ({
  onSave,
  onBack,
}: {
  onSave: (name: string, rules: MockRules) => Promise<void>;
  onBack: () => void;
}): ReactElement => {
  const [name, setName] = useState("Mock data");
  const [rules, setRules] = useState(MOCK_EXAMPLE);
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
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

    void runOrReport(onSave(name, parsed), (failure) => {
      let argument2: string = failure.message;

      if (!(failure instanceof Error)) {
        argument2 = String(failure);
      }

      return setError(argument2);
    });
  };

  return (
    <form
      className="frame-state-form"
      onSubmit={(event6) => {
        event6.preventDefault();
        submit();
      }}
    >
      <label className="frame-page-field">
        <span>{copy.name}</span>
        <input
          value={name}
          autoFocus
          onChange={(event2) => setName(event2.target.value)}
        />
      </label>
      <label className="frame-page-field">
        <span>{copy.answersForCallsFrom}</span>
        <textarea
          className="frame-state-rules"
          value={rules}
          spellCheck={false}
          rows={6}
          aria-invalid={Boolean(error)}
          onChange={(event3) => setRules(event3.target.value)}
        />
      </label>
      <p className="frame-page-hint">{copy.aPathThatEnds}</p>
      {error && <p className="frame-page-hint error">{error}</p>}
      <div className="frame-state-actions">
        <button type="button" className="btn small ghost" onClick={onBack}>
          {copy.back}
        </button>
        <button type="submit" className="btn small strong">
          {copy.showInThisFrame}
        </button>
      </div>
    </form>
  );
};

export { MockForm, SessionRows, StateRows, UserForm, menuKeys, stop };

export type { Panel };
