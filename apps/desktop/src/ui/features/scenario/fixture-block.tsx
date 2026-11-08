import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FixtureMake } from "./fixture-make.js";
import { FixtureRowItem } from "./fixture-row.js";
import { useFixture } from "./use-fixture.js";

interface FixtureBlockProps {
  readonly directionId: string;
  readonly projectId: string;
  readonly route: string | null;
}

const FixtureBlock = (props: FixtureBlockProps): ReactElement | null => {
  const state = useFixture(props);
  const hasRows = state.rows.length > 0;

  if (props.route === null && !hasRows) {
    return null;
  }

  return (
    <div>
      {props.route !== null && (
        <FixtureMake isBusy={state.isBusy} onMake={state.handleCreate} />
      )}
      {hasRows && <div className="ui-menu-label">{copy.fixtureLabel}</div>}
      {state.rows.map((row) => (
        <FixtureRowItem
          key={row.id}
          fixtureId={row.id}
          isDisabled={state.isBusy}
          label={row.sourceRoute}
          onDelete={state.handleDelete}
        />
      ))}
      {state.error !== null && (
        <p className="frame-page-hint error">{state.error}</p>
      )}
    </div>
  );
};

export { FixtureBlock };

export type { FixtureBlockProps };
