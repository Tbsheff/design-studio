import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { HomeScreen } from "./use-home-screen.js";

const HomeExtrasSlot = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement | null => {
  const { base, composer, draft, lib, modules } = screen;
  const { loadProjects } = lib;
  const { setFormError } = base;
  const { addFolder } = lib.workspaces;
  const { setLocation } = lib;

  const advanced = useMemo(
    () => ({
      designMd: draft.designMd,
      draft: draft.settingsDraft,
      onDesignMd: draft.setDesignMd,
      onDraft: draft.setSettingsDraft,
      onError: setFormError,
      opened: draft.advancedOpened,
    }),
    [draft, setFormError]
  );

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
      advanced={advanced}
      onHiddenMoved={reloadProjects}
    />
  );
};

export { HomeExtrasSlot };
