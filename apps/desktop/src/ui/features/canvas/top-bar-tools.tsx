import type { ReactElement } from "react";

import { tipWithKey } from "../../canvas-toolbar-slots.js";
import { copy } from "./copy.js";
import type { CanvasTool } from "./top-bar-menu.js";
import { TopBarToolButton } from "./top-bar-tool-button.js";
import type { ToolId } from "./top-bar-tool-button.js";

const toCommentTip = (isAvailable: boolean): string => {
  if (isAvailable) {
    return tipWithKey("Comment", "tool-comment");
  }

  return "Comments work on the live preview";
};

const TopBarTools = ({
  tool,
  commentAvailable,
  onTool,
}: {
  tool: CanvasTool;
  commentAvailable: boolean;
  onTool: (tool: ToolId) => void;
}): ReactElement => (
  <fieldset className="ui-tools topbar-tools" aria-label={copy.tool}>
    <TopBarToolButton
      id="select"
      icon="pointer"
      label={copy.select}
      current={tool}
      shortcut="V"
      tip={tipWithKey("Select elements", "tool-select")}
      isDisabled={false}
      pick={onTool}
    />
    <TopBarToolButton
      id="comment"
      icon="comment"
      label={copy.comment}
      current={tool}
      shortcut="C"
      tip={toCommentTip(commentAvailable)}
      isDisabled={!commentAvailable}
      pick={onTool}
    />
    <TopBarToolButton
      id="edit"
      icon="edit"
      label={copy.edit}
      current={tool}
      shortcut="Alt+1"
      tip={tipWithKey("Edit and layers", "layers")}
      isDisabled={false}
      pick={onTool}
    />
    <TopBarToolButton
      id="prototype"
      icon="link"
      label={copy.prototype}
      current={tool}
      shortcut=""
      tip={copy.linkElementsTo}
      isDisabled={false}
      pick={onTool}
    />
  </fieldset>
);

export { TopBarTools };
