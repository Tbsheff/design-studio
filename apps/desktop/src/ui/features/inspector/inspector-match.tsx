import type { SelectionContext } from "@design-studio/contracts";
import { memo } from "react";
import type { ReactElement } from "react";

import { MatchEmpty } from "./match-empty.js";
import { MatchKinds } from "./match-kinds.js";
import { toMatchTitle, toTargetLabel } from "./match-model.js";
import type { InspectorMatchProps, Scope } from "./match-scan-model.js";
import { ScopeToggle } from "./match-scope-toggle.js";
import { StatusLine } from "./match-status-line.js";
import { TokenPicker } from "./match-token-picker.js";
import { RareSection } from "./rare-section.js";
import { useInspectorMatch } from "./use-inspector-match.js";

const toScopeAside = (
  scope: Scope,
  onScope: (scope: Scope) => void
): ReactElement => <ScopeToggle scope={scope} onScope={onScope} />;

const InspectorMatchView = (props: InspectorMatchProps): ReactElement => {
  const match = useInspectorMatch(props);
  const { picker } = match;

  return (
    <RareSection
      title={toMatchTitle(match.scope, props.selection.length)}
      modifier="sm-section"
      aside={toScopeAside(match.scope, match.setScope)}
    >
      <MatchEmpty
        scope={match.scope}
        isLoading={match.scanned === null}
        hasRows={match.rows.length > 0}
      />
      <MatchKinds
        rows={match.rows}
        actions={match.actions}
        replaceLabel={match.replaceLabel}
      />
      {picker.picking && (
        <TokenPicker
          row={picker.picking}
          candidates={picker.candidates}
          target={toTargetLabel(picker.targets, match.isPageWide)}
          onPick={picker.handlePick}
          onClose={picker.handleClose}
        />
      )}
      <StatusLine status={match.status} />
    </RareSection>
  );
};

const isSameItems = (
  first: SelectionContext[],
  second: SelectionContext[]
): boolean =>
  first.length === second.length &&
  first.every((item, index) => item === second[index]);

const isSameTarget = (
  first: InspectorMatchProps,
  second: InspectorMatchProps
): boolean =>
  first.projectId === second.projectId &&
  first.directionId === second.directionId &&
  first.port === second.port;

const isSameMatch = (
  first: InspectorMatchProps,
  second: InspectorMatchProps
): boolean =>
  isSameTarget(first, second) &&
  first.tokens === second.tokens &&
  first.drain === second.drain &&
  isSameItems(first.selection, second.selection);

const InspectorMatch = memo(InspectorMatchView, isSameMatch);

export { InspectorMatch };
