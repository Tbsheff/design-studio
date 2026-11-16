import type { ReactElement } from "react";

import { EditAppConfirmDialog } from "./edit-app-confirm.js";
import { HomeHero } from "./home-hero.js";
import { StartArea } from "./start-area.js";
import type { HomeIde } from "./use-home-ide.js";
import type { HomeScreen } from "./use-home-screen.js";
import { WorkspaceHead } from "./workspace-head.js";

interface IdeCenterProps {
  readonly ide: HomeIde;
  readonly screen: HomeScreen;
}

const IdeCenter = ({ ide, screen }: IdeCenterProps): ReactElement => {
  const { editConfirm, nav, packName } = ide;

  const { onCancel: handleEditCancel, onConfirm: handleEditConfirm } =
    editConfirm;

  return (
    <main className="ide-center">
      <WorkspaceHead
        homeDir={screen.lib.homeDir}
        packName={packName}
        workspace={nav.selected}
      />
      <HomeHero screen={screen} />
      <StartArea ide={ide} screen={screen} />
      {editConfirm.path !== null && (
        <EditAppConfirmDialog
          onCancel={handleEditCancel}
          onConfirm={handleEditConfirm}
          path={editConfirm.path}
        />
      )}
    </main>
  );
};

export { IdeCenter };

export type { IdeCenterProps };
