import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ToolRow } from "./run-state-model.js";
import { toolSubject, toolVerb } from "./tool-labels-model.js";

const CheckDetail = ({
  members,
  workTree,
}: {
  members: ToolRow[];
  workTree: string | null;
}): ReactElement => (
  <ul className="tool-check-list flex flex-col gap-1 text-xs">
    {members.map((tool) => {
      const subject = toolSubject(tool.name, tool.input, workTree);

      return (
        <li key={tool.toolUseId} className="wrap-anywhere">
          <span className="text-foreground">{toolVerb(tool.name)}</span>
          {subject && <span className="font-mono"> {subject}</span>}
          {tool.summary && (
            <span className="text-muted-foreground">
              {copy.text}
              {tool.summary}
            </span>
          )}
        </li>
      );
    })}
  </ul>
);

export { CheckDetail };
