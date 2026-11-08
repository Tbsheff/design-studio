import type { PackProblem } from "@design-studio/contracts";
import type { ReactElement } from "react";

const LibraryProblemItem = ({
  problem,
}: {
  problem: PackProblem;
}): ReactElement => (
  <li>
    <code>{problem.id}</code> {problem.errors.join(" ")}
  </li>
);

export { LibraryProblemItem };
