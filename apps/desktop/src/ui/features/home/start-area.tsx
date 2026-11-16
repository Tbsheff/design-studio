import type { ReactElement } from "react";

import { TemplatesSection } from "./templates-section.js";
import type { HomeIde } from "./use-home-ide.js";
import type { HomeScreen } from "./use-home-screen.js";
import { WorkspaceCenter } from "./workspace-center.js";

interface StartAreaProps {
  readonly ide: HomeIde;
  readonly screen: HomeScreen;
}

const StartArea = ({ ide, screen }: StartAreaProps): ReactElement => {
  const { base, draft, modules, ui } = screen;
  const { pickTemplate: handlePick } = draft;
  const { onStarter: handleStarter } = ide;

  if (ui.prefs.hasTemplatesShown && draft.questions === null) {
    return (
      <TemplatesSection
        templates={modules.templates}
        selected={draft.template?.id ?? null}
        isDisabled={base.busy !== null}
        onPick={handlePick}
      />
    );
  }

  return (
    <WorkspaceCenter
      defaultLine={ide.defaultLine}
      isEditApp={ide.isEditApp}
      onStarter={handleStarter}
      workspace={ide.nav.selected}
    />
  );
};

export { StartArea };

export type { StartAreaProps };
