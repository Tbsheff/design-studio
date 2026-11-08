import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import type { Panel } from "./frame-state-ui-model.js";
import type { setFrameSession } from "./frame-states-model.js";

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
  const showUser = useCallback(() => onPanel("user"), [onPanel]);

  const forget = useCallback(() => onSession({ forget: true }), [onSession]);

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
        onClick={showUser}
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
      {kept > 0 && (
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          data-tip={`Kept in the studio data folder, never in the repo: ${view.session.captured.join(", ")}`}
          onClick={forget}
        >
          <Icon name="trash" size={14} />
          <span>{copy.forgetKeptCookies}</span>
          <span className="ui-menu-meta">{kept}</span>
        </button>
      )}
    </div>
  );
};

export { SessionRows };
