import type { ReactElement } from "react";

import type { PublishExpiryDays } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface PublishExpiryPickerProps {
  readonly value: PublishExpiryDays;
  readonly onChange: (value: PublishExpiryDays) => void;
}

const EXPIRIES: readonly SegmentOption<PublishExpiryDays>[] = [
  { icon: null, id: 1, label: copy.oneDay },
  { icon: null, id: 7, label: copy.sevenDays },
  { icon: null, id: 30, label: copy.thirtyDays },
  { icon: null, id: 0, label: copy.noEnd },
];

const PublishExpiryPicker = ({
  onChange,
  value,
}: PublishExpiryPickerProps): ReactElement => (
  <div className="export-field">
    <span className="export-label">{copy.stopsWorkingAfter}</span>
    <Segmented
      label={copy.stopsWorkingAfter}
      value={value}
      options={EXPIRIES}
      onChange={onChange}
    />
  </div>
);

export { PublishExpiryPicker };
