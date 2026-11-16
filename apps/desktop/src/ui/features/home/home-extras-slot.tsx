import { useCallback } from "react";
import type { ReactElement } from "react";

import type { HomeScreen } from "./use-home-screen.js";

const HomeExtrasSlot = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement | null => {
  const { base, composer, draft, lib, modules } = screen;
  const { loadProjects } = lib;
  const { addFolder } = lib.workspaces;
  const { setLocation } = lib;

  const reloadProjects = useCallback((): void => {
    loadProjects();
  }, [loadProjects]);

  if (!modules.extras || composer.flow.app.chip) {
    return null;
  }

  return (
    <modules.extras.ComposerFoot
      workspaces={lib.workspaces.workspaces}
      location={lib.location}
      prompt={draft.prompt}
      chooser={base.chooser}
      onLocation={setLocation}
      onAddFolder={addFolder}
      onHiddenMoved={reloadProjects}
    />
  );
};

export { HomeExtrasSlot };
