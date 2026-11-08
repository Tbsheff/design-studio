import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SampleCard = ({
  isBusy,
  onSample,
}: {
  readonly isBusy: boolean;
  readonly onSample: () => void;
}): ReactElement => (
  <button
    type="button"
    className="home-start-card sample"
    disabled={isBusy}
    onClick={onSample}
  >
    <span className="home-start-thumb" aria-hidden="true">
      <Icon name="play" size={16} />
    </span>
    <span className="home-start-text">
      <b>{copy.openTheSample}</b>
      <span>{copy.clickThroughAFinishedPrototype}</span>
    </span>
  </button>
);

export { SampleCard };
