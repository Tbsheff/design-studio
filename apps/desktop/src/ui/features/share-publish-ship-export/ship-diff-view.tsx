import type { ShipFile } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { ShipDiffLine } from "./ship-diff-line.js";
import { toDiffLines } from "./ship-diff-model.js";

interface ShipDiffViewProps {
  readonly file: ShipFile | null;
}

const ShipDiffView = ({ file }: ShipDiffViewProps): ReactElement => {
  if (!file) {
    return <div className="ship-diff empty">{copy.pickAFileTo}</div>;
  }

  return (
    <section className="ship-diff" aria-label={`${copy.diffOf} ${file.path}`}>
      {(file.refused || file.conflict) && (
        <div
          className={`ship-diff-note ${pick(file.refused, "refused", "conflict")}`}
        >
          {file.refused ?? file.conflict}
        </div>
      )}
      <pre>
        {toDiffLines(file).map((line) => (
          <ShipDiffLine key={line.id} line={line.text} />
        ))}
      </pre>
      {file.diffCut && (
        <div className="ship-diff-note">{copy.theDiffIsCut}</div>
      )}
    </section>
  );
};

export { ShipDiffView };
