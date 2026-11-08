import type { ReactElement } from "react";

import { MAX_PROBLEMS, toProblemsHead } from "./tweaks-model.js";

const TweaksProblemList = ({
  problems,
}: {
  readonly problems: string[];
}): ReactElement => (
  <div>
    <p className="twk-problems-head">{toProblemsHead(problems.length)}</p>
    <ul>
      {problems.slice(0, MAX_PROBLEMS).map((problem) => (
        <li key={problem}>{problem}</li>
      ))}
    </ul>
  </div>
);

export { TweaksProblemList };
