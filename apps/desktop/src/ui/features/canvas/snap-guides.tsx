import type { ReactElement } from "react";

import { fullStyle, guideStyle } from "./overlay-styles.js";
import type { SnapGuide } from "./snap-model.js";

const SnapGuides = ({
  guides,
  full,
}: {
  guides: SnapGuide[];
  full?: boolean;
}): ReactElement | null => {
  if (guides.length === 0) {
    return null;
  }

  let part2: "" | " full" = "";
  let toStyle = guideStyle;

  if (full) {
    part2 = " full";
    toStyle = fullStyle;
  }

  return (
    <div className={`snap-guides${part2}`} data-testid="snap-guides">
      {guides.map((snapGuide3) => (
        <div
          key={`${snapGuide3.axis}-${snapGuide3.at}`}
          className={`snap-guide ${snapGuide3.axis}`}
          style={toStyle(snapGuide3)}
        />
      ))}
    </div>
  );
};

export { SnapGuides };
