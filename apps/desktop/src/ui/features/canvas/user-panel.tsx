import type { MockUser } from "@design-studio/contracts/frame-state";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { setFrameSession } from "./frame-states-model.js";
import type { PanelMenu } from "./use-panel-menu.js";
import { UserForm } from "./user-form.js";

const UserPanel = ({
  projectId,
  user,
  menu,
}: {
  projectId: string;
  user: MockUser;
  menu: PanelMenu;
}): ReactElement => {
  const { close, setPanel } = menu;
  const back = useCallback(() => setPanel("list"), [setPanel]);

  const save = useCallback(
    async (next: MockUser): Promise<void> => {
      await setFrameSession(projectId, { user: next });
      close(true);
    },
    [projectId, close]
  );

  return <UserForm user={user} onBack={back} onSave={save} />;
};

export { UserPanel };
