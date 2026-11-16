import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { setRailToggled, useRail } from "../../features/home/index.js";
import { tipWithKey } from "../../platform/key-tip.js";
import { copy } from "./copy";

const ProjectListToggle = (): ReactElement => {
  const rail = useRail();

  return (
    <button
      type="button"
      className="studio-top-icon"
      aria-label={copy.projectList}
      aria-pressed={rail === "open"}
      data-rail-toggle=""
      data-tip={tipWithKey(copy.projectList, "project-rail")}
      onClick={setRailToggled}
    >
      <Icon name="sidebar" size={16} />
    </button>
  );
};

export { ProjectListToggle };
