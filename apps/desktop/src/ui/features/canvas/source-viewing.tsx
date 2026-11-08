import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface SourceViewingProps {
  readonly onBack: () => void;
  readonly title: string;
}

const SourceViewing = ({ onBack, title }: SourceViewingProps): ReactElement => (
  <span className="pill">
    <Icon name="eye" size={14} />
    <span className="pill-text">
      {copy.viewing}
      {title}
    </span>
    <button type="button" className="link" onClick={onBack}>
      {copy.backToLive}
    </button>
  </span>
);

export { SourceViewing };
