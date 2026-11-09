import { BrandMark } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SidebarTop = (): ReactElement => (
  <div className="ide-side-top">
    <BrandMark />
    <span className="ide-brand">{copy.designStudio}</span>
  </div>
);

export { SidebarTop };
