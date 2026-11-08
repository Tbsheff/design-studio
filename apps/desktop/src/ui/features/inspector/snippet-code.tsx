import type { ReactElement } from "react";

import { CodeHighlight } from "./code-highlight.js";
import { copy } from "./copy.js";

interface Props {
  readonly code: string;
}

const SnippetCode = ({ code }: Props): ReactElement => (
  <figure className="ins-code-figure" aria-label={copy.elementSource}>
    <pre className="ins-code-pre">
      <CodeHighlight code={code} />
    </pre>
  </figure>
);

export { SnippetCode };
