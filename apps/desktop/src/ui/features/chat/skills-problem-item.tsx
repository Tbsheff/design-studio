import type { SkillCatalog } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const SkillsProblemItem = ({
  problem,
}: {
  problem: SkillCatalog["problems"][number];
}): ReactElement => (
  <li>
    <span className="mono">{problem.source}</span>
    {copy.text10} {problem.reason}
  </li>
);

export { SkillsProblemItem };
