import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface FixtureMakeProps {
  readonly isBusy: boolean;
  readonly onMake: () => void;
}

const FixtureMake = (props: FixtureMakeProps): ReactElement => {
  const label = props.isBusy && copy.fixtureMaking;

  return (
    <>
      <p className="frame-state-note">{copy.fixtureLead}</p>
      <button
        type="button"
        role="menuitem"
        className="ui-menu-item"
        tabIndex={-1}
        disabled={props.isBusy}
        onClick={props.onMake}
      >
        <span>{label || copy.fixtureMake}</span>
      </button>
    </>
  );
};

export { FixtureMake };

export type { FixtureMakeProps };
