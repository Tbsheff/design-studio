import type { ReactElement } from "react";

interface CheckProblemListProps {
  readonly problems: readonly string[];
}

const CheckProblemList = ({
  problems,
}: CheckProblemListProps): ReactElement => (
  <ul className="check-errors">
    {problems.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export { CheckProblemList };
