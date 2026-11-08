import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const LibraryHeader = ({ onBack }: { onBack: () => void }): ReactElement => (
  <header className="home-header">
    <button
      type="button"
      className="btn ghost small has-icon back-btn"
      onClick={onBack}
    >
      <Icon name="arrowLeft" size={14} />
      {COPY.textBack}
    </button>
  </header>
);

export { LibraryHeader };
