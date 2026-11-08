import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { SnapToggle } from "./inspector-tokens.js";
import { StatusText } from "./status-text.js";
import type { SaveStatus } from "./use-direct-edit.js";
import type { TokenUi } from "./use-token-snap.js";

interface MetaRowProps {
  readonly tag: string | null;
  readonly source: ReactNode;
  readonly status: SaveStatus;
  readonly ui: TokenUi | null;
  readonly onReset: () => void;
  readonly isResetDisabled: boolean;
  readonly children: ReactNode;
}

const MetaRow = ({
  tag,
  source,
  status,
  ui,
  onReset,
  isResetDisabled,
  children,
}: MetaRowProps): ReactElement => (
  <div className="ins-meta">
    {tag && <span className="ins-tag">{tag}</span>}
    {source}
    <output className="ins-header-end" aria-live="polite">
      <StatusText status={status} />
    </output>
    <SnapToggle ui={ui} />
    {children}
    <button
      type="button"
      className="btn ghost small"
      onClick={onReset}
      disabled={isResetDisabled}
    >
      {copy.reset}
    </button>
  </div>
);

export { MetaRow };
