import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toToggleIcon, toToggleLabel } from "./draft-sources-model.js";

const TOGGLE_SIZE = 14;

interface SourcesToggleProps {
  readonly isOpen: boolean;
  readonly listId: string;
  readonly onToggle: () => void;
}

const SourcesToggle = ({
  isOpen,
  listId,
  onToggle,
}: SourcesToggleProps): ReactElement => (
  <button
    type="button"
    className="icon-btn small ds-src-toggle"
    aria-expanded={isOpen}
    aria-controls={listId}
    aria-label={toToggleLabel(isOpen)}
    data-tip={toToggleLabel(isOpen)}
    data-tip-align="end"
    onClick={onToggle}
  >
    <Icon name={toToggleIcon(isOpen)} size={TOGGLE_SIZE} />
  </button>
);

export { SourcesToggle };
