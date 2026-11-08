import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { LintIssue } from "./deps.js";

const LintIssueHint = ({
  issue,
}: {
  readonly issue: LintIssue;
}): ReactElement => {
  const { exact } = issue.token;
  const token = <code>{issue.token.cssVar}</code>;

  if (issue.kind === "color" && !exact) {
    return (
      <>
        {copy.offPaletteNearestIs}
        {token}
        {copy.deltaE}
        {issue.deltaE?.toFixed(1)}
      </>
    );
  }

  if (issue.kind === "font" && !exact) {
    return (
      <>
        {copy.notFontTokenUse}
        {token}
      </>
    );
  }

  if (exact) {
    return (
      <>
        {copy.sameAs}
        {token}
        {copy.butTypedRaw}
      </>
    );
  }

  return (
    <>
      {copy.near}
      {token}
      {` (${issue.token.value})`}
    </>
  );
};

export { LintIssueHint };
