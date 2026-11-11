import type {
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";
import type { ReactElement } from "react";

import { DIALOG_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { DraftSummary } from "./draft-summary.js";
import type { RunView } from "./run-state-model.js";
import { SaveControls } from "./save-controls.js";

interface DraftPopProps {
  readonly check: DesignSystemCheckResult | null;
  readonly coverage: DesignSystemCoverage | null;
  readonly error: string | null;
  readonly id: string;
  readonly isOpen: boolean;
  readonly isReady: boolean;
  readonly lastRun: RunView | null;
  readonly onSave: (force: boolean) => Promise<void>;
  readonly readyId: string;
  readonly reading: boolean;
  readonly running: boolean;
}

const DraftPop = (props: DraftPopProps): ReactElement => (
  <div
    id={props.id}
    className="ui-popover draft-pop"
    role={DIALOG_ROLE}
    aria-label={copy.draftDetails}
    hidden={!props.isOpen}
  >
    <DraftSummary
      coverage={props.coverage}
      check={props.check}
      run={props.lastRun}
      error={props.error}
    />
    <div className="draft-actions">
      <SaveControls
        check={props.check}
        isReady={props.isReady}
        readyId={props.readyId}
        reading={props.reading}
        running={props.running}
        onSave={props.onSave}
      />
    </div>
  </div>
);

export { DraftPop };
