import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SavedNote = ({ onOpen }: { onOpen: () => void }): ReactElement => (
  <output className="draft-saved">
    {copy.savedForNewProjects}
    <button type="button" className="link-btn" onClick={onOpen}>
      {copy.openDesignSystems}
    </button>
  </output>
);

export { SavedNote };
