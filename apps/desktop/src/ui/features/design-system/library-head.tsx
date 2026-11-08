import type { ReactElement, RefObject } from "react";

import { COPY } from "./copy.js";
import { LibraryHeadActions } from "./library-head-actions.js";

const LibraryHead = ({
  fileInput,
  isImporting,
  onFile,
  onNew,
}: {
  fileInput: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  onFile: (file: File) => void;
  onNew: () => void;
}): ReactElement => (
  <div className="lib-head">
    <div className="lib-titles">
      <h1>{COPY.labelDesignSystems}</h1>
      <p className="muted">{COPY.textTokensFontsAndA}</p>
    </div>
    <LibraryHeadActions
      fileInput={fileInput}
      isImporting={isImporting}
      onFile={onFile}
      onNew={onNew}
    />
  </div>
);

export { LibraryHead };
