import type { ShareExpiryHours } from "@design-studio/contracts/share";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface ShareExpiryPickerProps {
  readonly value: ShareExpiryHours;
  readonly onChange: (value: ShareExpiryHours) => void;
}

const EXPIRIES: readonly SegmentOption<ShareExpiryHours>[] = [
  { icon: null, id: 1, label: copy.oneHour },
  { icon: null, id: 24, label: copy.twentyFourHours },
  { icon: null, id: 168, label: copy.sevenDays },
];

const ShareExpiryPicker = ({
  onChange,
  value,
}: ShareExpiryPickerProps): ReactElement => (
  <Segmented
    label={copy.linkEndsAfter}
    value={value}
    options={EXPIRIES}
    onChange={onChange}
  />
);

export { ShareExpiryPicker };
