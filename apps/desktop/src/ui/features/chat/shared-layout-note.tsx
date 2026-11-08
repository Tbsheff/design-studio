import type { ComponentUsage } from "@design-studio/contracts/usage-scope";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const NOTE_ROLE = "note";

const SharedLayoutNote = ({
  usage,
}: {
  usage: ComponentUsage;
}): ReactElement => {
  const site = usage.callSite;
  const count = Math.max(site?.routes ?? 0, usage.routes.length);

  return (
    <div
      className="inline-prompt-scope inline-prompt-shared"
      role={NOTE_ROLE}
      data-tip={`${site?.file ?? usage.file} renders this for ${count} routes. A page cannot change its parent layout, so the run changes it on all of them.`}
    >
      {copy.sharedLayoutThisChange}
      {count}
      {copy.routes}
    </div>
  );
};

export { SharedLayoutNote };
