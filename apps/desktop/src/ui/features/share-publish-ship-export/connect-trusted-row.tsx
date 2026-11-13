import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectTrustedAdd } from "./connect-trusted-add.js";
import { ConnectTrustedList } from "./connect-trusted-list.js";
import { trustedCopy } from "./copy.js";
import { pick } from "./pick.js";
import {
  toEnvOnlyFolders,
  toFolderCountText,
} from "./trusted-folders-model.js";
import { useTrustedFolders } from "./use-trusted-folders.js";

const CHEVRON_SIZE = 12;

interface ConnectTrustedRowProps {
  readonly isBusy: boolean;
  readonly setup: ConnectSetup;
  readonly onChange: (folders: readonly string[]) => void;
}

const ConnectTrustedRow = ({
  isBusy,
  onChange,
  setup,
}: ConnectTrustedRowProps): ReactElement => {
  const state = useTrustedFolders(setup, onChange);
  const { handleRemove, handleToggle, isOpen } = state;
  const saved = setup.trustedFolders;
  const envOnly = toEnvOnlyFolders(saved, setup.envTrustedFolders);
  const count = saved.length + envOnly.length;

  return (
    <div
      className="connect-trusted export-control"
      data-testid="connect-trusted"
    >
      <button
        type="button"
        className="connect-trusted-toggle"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <Icon
          name={pick(isOpen, "chevronDown", "chevronRight")}
          size={CHEVRON_SIZE}
        />
        <h4>{trustedCopy.title}</h4>
        <span className="export-sub">{toFolderCountText(count)}</span>
      </button>
      {isOpen && (
        <div className="connect-trusted-body">
          <p className="export-sub">{trustedCopy.note}</p>
          {count > 0 && (
            <ConnectTrustedList
              envOnly={envOnly}
              isBusy={isBusy}
              saved={saved}
              onRemove={handleRemove}
            />
          )}
          <ConnectTrustedAdd isBusy={isBusy} state={state} />
        </div>
      )}
    </div>
  );
};

export { ConnectTrustedRow };
