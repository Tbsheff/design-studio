import type { ReactElement } from "react";

import { ActionContent } from "../../ai/components/ai/action-content.js";
import { CheckDetail } from "./check-detail.js";
import type { ToolRow } from "./run-state-model.js";
import { toStyled } from "./styled.js";
import type { ToolState } from "./tool-chips-model.js";
import { ToolDetail } from "./tool-detail.js";

const Content = toStyled(ActionContent, "pl-6");

const ToolItemContent = ({
  isMixed,
  members,
  workTree,
  tool,
  target,
  state,
}: {
  isMixed: boolean;
  members: ToolRow[];
  workTree: string | null;
  tool: ToolRow;
  target: string;
  state: ToolState;
}): ReactElement => (
  <Content>
    {isMixed && <CheckDetail members={members} workTree={workTree} />}
    {!isMixed && <ToolDetail tool={tool} target={target} state={state} />}
  </Content>
);

export { ToolItemContent };
