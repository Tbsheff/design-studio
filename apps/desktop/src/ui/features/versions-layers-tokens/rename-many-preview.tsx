import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { PatternPreview } from "./rename-pattern-model.js";

interface RenameManyPreviewProps {
  readonly preview: PatternPreview;
}

const toMoreText = (more: number): string => {
  if (more === 0) {
    return "";
  }

  return `${COPY.andPrefix}${more}${COPY.andMoreFiles}`;
};

const RenameManyPreview = ({ preview }: RenameManyPreviewProps): ReactNode => {
  const moreText = toMoreText(preview.more);

  return (
    <ul className="layers-rename-list" data-testid="rename-many-preview">
      {preview.rows.map((row) => (
        <li key={row.id} className="layers-rename-name">
          {row.name}
        </li>
      ))}
      {moreText !== "" && <li className="layers-rename-more">{moreText}</li>}
    </ul>
  );
};

export { RenameManyPreview };
