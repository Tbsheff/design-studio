import type { ReactElement } from "react";

import { EditAppConfirmDialog } from "./edit-app-confirm.js";
import { HomeHero } from "./home-hero.js";
import type { HomeIde } from "./use-home-ide.js";
import type { HomeScreen } from "./use-home-screen.js";
import { WorkspaceCenter } from "./workspace-center.js";
import { WorkspaceHead } from "./workspace-head.js";

interface IdeCenterProps {
  readonly ide: HomeIde;
  readonly screen: HomeScreen;
}

const IdeCenter = ({ ide, screen }: IdeCenterProps): ReactElement => {
  const { defaultLine, editConfirm, isEditApp, nav, onStarter, packName } = ide;

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
      <WorkspaceCenter
        defaultLine={defaultLine}
        isEditApp={isEditApp}
        onStarter={onStarter}
        workspace={nav.selected}
      />
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
