import type { ReactElement } from "react";
import { useRef } from "react";

import { StudioToast } from "../../app/shell/studio-parts.js";
import type { LibraryFrom } from "../../platform/storage.js";
import { COPY } from "./copy.js";
import { LibraryDialogHost } from "./library-dialog-host.js";
import { LibraryGroups } from "./library-groups.js";
import { LibraryHead } from "./library-head.js";
import { LibraryHeader } from "./library-header.js";
import { LibraryProblems } from "./library-problems.js";
import { useLibrary } from "./use-library.js";

const DesignSystems = ({
  from,
}: {
  from: LibraryFrom | null;
}): ReactElement => {
  const library = useLibrary(from);
  const { back, importFile, newDesignSystem, openPack } = library;
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="home lib">
      <LibraryHeader onBack={back} />
      <main className="lib-main">
        <LibraryHead
          fileInput={fileInput}
          isImporting={library.isImporting}
          onFile={importFile}
          onNew={newDesignSystem}
        />
        {library.importError && (
          <div className="alert error small" role="alert">
            {COPY.textCouldNotImport}
            {library.importError}
          </div>
        )}
        {library.error && (
          <div className="alert error small">
            {COPY.textCouldNotLoadDesign}
            {library.error}
          </div>
        )}
        <LibraryProblems problems={library.problems} />
        <LibraryGroups
          builtin={library.builtin}
          onNew={newDesignSystem}
          onOpen={openPack}
          packs={library.packs}
          yours={library.yours}
        />
      </main>
      <LibraryDialogHost library={library} />
      <StudioToast text={library.toast} />
    </div>
  );
};

export { DesignSystems };
