import type { ReactElement } from "react";

import { textListCopy } from "./copy.js";
import { toOnClass } from "./rows-model.js";

interface ListStyleInsideProps {
  readonly isDisabled: boolean;
  readonly isOn: boolean;
  readonly onToggle: () => void;
}

const ListStyleInside = ({
  isDisabled,
  isOn,
  onToggle,
}: ListStyleInsideProps): ReactElement => (
  <fieldset className="ins-toggles" aria-label={textListCopy.inside}>
    <button
      type="button"
      className={toOnClass(isOn)}
      aria-label={textListCopy.insideTip}
      aria-pressed={isOn}
      data-tip={textListCopy.insideTip}
      disabled={isDisabled}
      onClick={onToggle}
    >
      {textListCopy.inside}
    </button>
  </fieldset>
);

export { ListStyleInside };
