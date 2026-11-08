import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { DropMenu } from "./top-bar-drop-menu.js";
import type { Props } from "./top-bar-props.js";

const TopBarFileMenu = ({ props }: { props: Props }): ReactElement => (
  <DropMenu
    label="Pages and frames"
    triggerClass="topbar-file"
    groups={props.fileMenu}
    onOpen={props.onFileMenuOpen}
    tip="Pages and frames"
  >
    <span className="truncate">{props.fileName}</span>
    <Icon name="chevronDown" size={12} />
  </DropMenu>
);

export { TopBarFileMenu };
