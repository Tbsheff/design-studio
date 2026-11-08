import type { ReactElement } from "react";

import { toCodeTokens } from "./code-highlight-model.js";

interface Props {
  readonly code: string;
}

const CodeHighlight = ({ code }: Props): ReactElement => (
  <code>
    {toCodeTokens(code).map((token) => {
      if (token.kind === "plain") {
        return token.text;
      }

      return (
        <span key={token.start} className={`tok-${token.kind}`}>
          {token.text}
        </span>
      );
    })}
  </code>
);

export { CodeHighlight };
