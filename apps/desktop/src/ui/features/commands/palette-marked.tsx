import type { ReactElement } from "react";

import { MarkedSegment } from "./palette-marked-segment.js";
import { toMarkedSegments } from "./palette-model.js";

const Marked = ({
  text,
  marks,
}: {
  text: string;
  marks: number[];
}): ReactElement => (
  <>
    {toMarkedSegments(text, marks).map((segment) => (
      <MarkedSegment
        key={segment.id}
        isMarked={segment.isMarked}
        text={segment.text}
      />
    ))}
  </>
);

export { Marked };
