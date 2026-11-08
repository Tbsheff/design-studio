import type { ReactElement } from "react";

import { RuleGroup } from "./rule-group.js";

interface Problem {
  readonly message: string;
  readonly rule: string;
}

const toGroups = (problems: readonly Problem[]): [string, string[]][] => {
  const byRule = new Map<string, string[]>();

  for (const problem of problems) {
    byRule.set(problem.rule, [
      ...(byRule.get(problem.rule) ?? []),
      problem.message,
    ]);
  }

  return [...byRule];
};

const toProblemsLabel = (count: number): string => {
  if (count === 1) {
    return "1 problem";
  }

  return `${count} problems`;
};

const CheckFailed = ({
  problems,
}: {
  problems: readonly Problem[];
}): ReactElement => (
  <output className="lib-check fail">
    <strong>{toProblemsLabel(problems.length)}</strong>
    <ul>
      {toGroups(problems).map(([rule, messages]) => (
        <RuleGroup key={rule} messages={messages} rule={rule} />
      ))}
    </ul>
  </output>
);

export { CheckFailed };
