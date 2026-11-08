import type { DiffHunk as DiffHunkData } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DiffLine } from "./diff-line.js";
import { toDiffRows } from "./diff-rows-model.js";

const DiffHunk = ({
  hasGap,
  hunk,
}: {
  hasGap: boolean;
  hunk: DiffHunkData;
}): ReactElement => (
  <div className="diff-hunk">
    {hasGap && (
      <div className="diff-gap" aria-hidden="true">
        {copy.text12}
      </div>
    )}
    {toDiffRows(hunk).map((row) => (
      <DiffLine key={row.key} row={row} />
    ))}
  </div>
);

export { DiffHunk };
