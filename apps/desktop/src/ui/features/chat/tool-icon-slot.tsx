import type { ReactElement } from "react";

import { ActionIcon } from "../../ai/components/ai/action-icon.js";
import type { ToolRow } from "./run-state-model.js";
import { toStyledByKey } from "./styled.js";
import type { ToolState } from "./tool-chips-model.js";
import { ToolStateIcon } from "./tool-state-icon.js";
import { STATE_TONE } from "./tool-state-model.js";

const IconSlot = toStyledByKey(ActionIcon, STATE_TONE);

const ToolIconSlot = ({
  state,
  tool,
}: {
  state: ToolState;
  tool: ToolRow;
}): ReactElement => (
  <IconSlot data-variant={state}>
    <ToolStateIcon tool={tool} state={state} />
  </IconSlot>
);

export { ToolIconSlot };
