import { useCallback } from "react";
import type { ReactElement } from "react";

interface RowProps {
  readonly isChecked: boolean;
  readonly isDisabled: boolean;
  readonly label: string;
  readonly onPick: (scenarioId: string | null) => void;
  readonly scenarioId: string | null;
}

const ScenarioRow = (props: RowProps): ReactElement => {
  const { onPick, scenarioId } = props;

  const handlePick = useCallback(() => {
    onPick(scenarioId);
  }, [onPick, scenarioId]);

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={props.isChecked}
      className="ui-menu-item"
      tabIndex={-1}
      disabled={props.isDisabled}
      onClick={handlePick}
    >
      <span>{props.label}</span>
    </button>
  );
};

export { ScenarioRow };
