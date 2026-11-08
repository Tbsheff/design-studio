import { useCallback } from "react";
import type { ReactElement } from "react";

import type { MockRules } from "./frame-state-ui-model.js";
import { setFrameState } from "./frame-states-model.js";
import { MockForm } from "./mock-form.js";
import type { PanelMenu } from "./use-panel-menu.js";

const MockPanel = ({
  projectId,
  frameId,
  menu,
}: {
  projectId: string;
  frameId: string;
  menu: PanelMenu;
}): ReactElement => {
  const { close, setPanel } = menu;
  const back = useCallback(() => setPanel("list"), [setPanel]);

  const save = useCallback(
    async (name: string, rules: MockRules): Promise<void> => {
      await setFrameState(projectId, frameId, "mock", { name, rules });
      close(true);
    },
    [projectId, frameId, close]
  );

  return <MockForm onBack={back} onSave={save} />;
};

export { MockPanel };
