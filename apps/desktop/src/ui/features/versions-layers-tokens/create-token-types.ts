import type { TokenGroupName } from "@design-studio/contracts";

interface CreateTokenSubmit {
  group: TokenGroupName;
  name: string;
  value: string;
  darkValue?: string;
  apply: boolean;
}

interface TokenFailure {
  readonly field: "name" | "form";
  readonly message: string;
}

interface TokenProblems {
  readonly darkProblem: string | null;
  readonly isInvalid: boolean;
  readonly nameProblem: string | null;
  readonly valueProblem: string | null;
}

export type { CreateTokenSubmit, TokenFailure, TokenProblems };
