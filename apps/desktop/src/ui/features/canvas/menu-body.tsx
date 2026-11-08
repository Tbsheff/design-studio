import type { FrameStatesView } from "@design-studio/contracts/frame-state";
import type { ReactElement } from "react";

import { MockPanel } from "./mock-panel.js";
import { StateListPanel } from "./state-list-panel.js";
import type { PanelMenu } from "./use-panel-menu.js";
import { UserPanel } from "./user-panel.js";

const MenuBody = ({
  projectId,
  frameId,
  directionId,
  view,
  chosen,
  menu,
  onError,
}: {
  projectId: string;
  frameId: string;
  directionId: string | null;
  view: FrameStatesView;
  chosen: string;
  menu: PanelMenu;
  onError: (message: string | null) => void;
}): ReactElement => {
  if (menu.panel === "user") {
    return (
      <UserPanel projectId={projectId} user={view.session.user} menu={menu} />
    );
  }

  if (menu.panel === "mock") {
    return <MockPanel projectId={projectId} frameId={frameId} menu={menu} />;
  }

  return (
    <StateListPanel
      projectId={projectId}
      frameId={frameId}
      directionId={directionId}
      view={view}
      chosen={chosen}
      menu={menu}
      onError={onError}
    />
  );
};

export { MenuBody };
