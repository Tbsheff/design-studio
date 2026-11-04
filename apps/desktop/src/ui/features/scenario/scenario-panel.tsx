import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScenarioRow } from "./scenario-row.js";
import { useScenario } from "./use-scenario.js";

interface PanelProps {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

const ScenarioPanel = (props: PanelProps): ReactElement => {
  const state = useScenario(props);
  const hasRows = state.rows.length > 0;
  const createLabel = state.isBusy && copy.generating;

  return (
    <section className="ui-menu-section" aria-label={copy.label}>
      <div className="ui-menu-label">{copy.label}</div>
      <button
        type="button"
        role="menuitem"
        className="ui-menu-item"
        tabIndex={-1}
        disabled={state.isBusy}
        onClick={state.handleCreate}
      >
        <span>{createLabel || copy.generate}</span>
      </button>
      {hasRows && (
        <ScenarioRow
          isChecked={state.appliedId === null}
          isDisabled={state.isBusy}
          label={copy.real}
          onPick={state.handleApply}
          scenarioId={null}
        />
      )}
      {state.rows.map((row) => (
        <ScenarioRow
          key={row.id}
          isChecked={state.appliedId === row.id}
          isDisabled={state.isBusy}
          label={copy.kinds[row.kind]}
          onPick={state.handleApply}
          scenarioId={row.id}
        />
      ))}
      {hasRows && (
        <button
          type="button"
          role="menuitem"
          className="ui-menu-item"
          tabIndex={-1}
          disabled={state.isBusy}
          onClick={state.handleCheck}
        >
          <span>{copy.check}</span>
        </button>
      )}
      {state.contactSheet !== null && (
        <p className="frame-state-note">{copy.checked}</p>
      )}
      <p className="frame-state-note">{copy.unseenLead}</p>
      {state.error !== null && (
        <p className="frame-page-hint error">{state.error}</p>
      )}
    </section>
  );
};

export { ScenarioPanel };

export type { PanelProps };
