import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface FixtureRowProps {
  readonly fixtureId: string;
  readonly isDisabled: boolean;
  readonly label: string;
  readonly onDelete: (fixtureId: string) => void;
}

const FixtureRowItem = (props: FixtureRowProps): ReactElement => {
  const { fixtureId, onDelete } = props;

  const handleDelete = useCallback(() => {
    onDelete(fixtureId);
  }, [fixtureId, onDelete]);

  return (
    <div className="ui-menu-item">
      <span>{props.label}</span>
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        data-tip={copy.fixtureDelete}
        aria-label={copy.fixtureDelete}
        disabled={props.isDisabled}
        onClick={handleDelete}
      >
        <span>{copy.fixtureDelete}</span>
      </button>
    </div>
  );
};

export { FixtureRowItem };

export type { FixtureRowProps };
