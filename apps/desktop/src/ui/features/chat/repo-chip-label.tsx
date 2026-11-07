import type { ReactElement } from "react";

interface RepoChipLabelProps {
  readonly names: string;
}

const REPO_LABEL = "Repo ";

const RepoChipLabel = ({ names }: RepoChipLabelProps): ReactElement => (
  <span className="chip-text min-w-0 truncate">
    {REPO_LABEL}
    <span className="font-mono text-foreground">{names}</span>
  </span>
);

export { RepoChipLabel };
