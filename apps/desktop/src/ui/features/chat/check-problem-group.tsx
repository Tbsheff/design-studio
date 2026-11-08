import type { ReactElement } from "react";

import { RULE_LABEL } from "./draft-improve-model.js";
import type { ProblemGroup } from "./draft-improve-model.js";

const CheckProblemGroup = ({
  group,
}: {
  group: ProblemGroup;
}): ReactElement => (
  <section className="draft-problem-group">
    <h3>
      {RULE_LABEL[group.rule]}{" "}
      <span className="draft-problem-count">{group.items.length}</span>
    </h3>
    <ul>
      {group.items.map((item) => (
        <li key={item.key}>{item.text}</li>
      ))}
    </ul>
  </section>
);

export { CheckProblemGroup };
