import type { PackProblem } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { toProblemsTitle } from "./library-model.js";
import { LibraryProblemItem } from "./library-problem-item.js";

const LibraryProblems = ({
  problems,
}: {
  problems: PackProblem[];
}): ReactElement | null => {
  if (problems.length === 0) {
    return null;
  }

  return (
    <details className="lib-problems">
      <summary>{toProblemsTitle(problems.length)}</summary>
      <ul>
        {problems.map((problem) => (
          <LibraryProblemItem
            key={`${problem.source}:${problem.id}`}
            problem={problem}
          />
        ))}
      </ul>
    </details>
  );
};

export { LibraryProblems };
