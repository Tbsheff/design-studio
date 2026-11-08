import type { FigmaImportPreview } from "@design-studio/contracts/figma-nodes";
import type { ReactElement } from "react";

import { toFacts, toSummarySize } from "./figma-import-model.js";
import { FigmaKitList } from "./figma-kit-list.js";
import { FigmaNotesList } from "./figma-notes-list.js";

interface Props {
  readonly preview: FigmaImportPreview;
}

const FigmaSummary = ({ preview }: Props): ReactElement => {
  const { frame, stats } = preview;

  return (
    <div className="fgi-summary" aria-live="polite">
      <div className="fgi-frame">
        <strong>{frame.name}</strong>
        <span>{toSummarySize(frame)}</span>
      </div>
      <div className="fgi-facts">{toFacts(stats).join(" · ")}</div>
      <FigmaKitList kit={stats.kit} />
      <FigmaNotesList notes={stats.notes} />
      <div className="fgi-code-wrap">
        <pre className="fgi-code">{preview.markup}</pre>
      </div>
    </div>
  );
};

export { FigmaSummary };
