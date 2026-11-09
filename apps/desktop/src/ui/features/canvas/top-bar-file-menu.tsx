import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DropMenu } from "./top-bar-drop.js";
import type { Props } from "./top-bar-props.js";

const TopBarFileMenu = ({ props }: { props: Props }): ReactElement => (
  <DropMenu
    label={copy.pagesAndFrames}
    triggerClass="topbar-file"
    groups={props.fileMenu}
    onOpen={props.onFileMenuOpen}
    tip={copy.pagesAndFrames}
  >
    <span className="topbar-crumb-sep" aria-hidden="true">
      {copy.crumbSep}
    </span>
    <span className="truncate">{props.fileName}</span>
    <Icon name="chevronDown" size={12} />
  </DropMenu>
);

export { TopBarFileMenu };
