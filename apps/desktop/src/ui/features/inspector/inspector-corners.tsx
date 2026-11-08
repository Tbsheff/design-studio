import { useCallback, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CornerField } from "./corner-field.js";
import {
  ALL_CORNERS,
  CORNERS,
  hasSplitCorners,
  toCorners,
} from "./corners-model.js";
import { NumberField } from "./number-field.js";
import { proxyEdit } from "./proxy-edit.js";
import { RadiusToggle } from "./radius-toggle.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface RadiusFieldProps {
  readonly edit: DirectEdit;
  readonly short: string;
}

const BORDER_RADIUS = "border-radius" as const;

const RadiusField = ({ edit, short }: RadiusFieldProps): ReactElement => {
  const radius = edit.values[BORDER_RADIUS];
  const [isSplit, setIsSplit] = useState(() => hasSplitCorners(radius));
  const corners = toCorners(radius);

  const handleToggle = useCallback(() => setIsSplit((isOn) => !isOn), []);

  const spec = useMemo(
    () => ({
      edit: proxyEdit(
        edit,
        BORDER_RADIUS,
        radius,
        (value) => ({ [BORDER_RADIUS]: value }),
        [BORDER_RADIUS],
        { isMixed: null, part: ALL_CORNERS }
      ),
      label: copy.borderRadius,
      min: 0,
      prop: BORDER_RADIUS,
    }),
    [edit, radius]
  );

  if (!isSplit) {
    return (
      <div className="ins-radius">
        <NumberField short={short} spec={spec} />
        <RadiusToggle isSplit={isSplit} onToggle={handleToggle} />
      </div>
    );
  }

  return (
    <div className="ins-radius split">
      <div className="ins-grid">
        {CORNERS.map((corner) => (
          <CornerField
            key={corner.side}
            corners={corners}
            source={edit}
            label={corner.label}
            short={corner.short}
            side={corner.side}
          />
        ))}
      </div>
      <RadiusToggle isSplit={isSplit} onToggle={handleToggle} />
    </div>
  );
};

export { RadiusField };
