import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SnippetCode } from "./snippet-code.js";
import type { Snippet } from "./snippet-model.js";

interface Props {
  readonly snippet: Snippet;
}

const ALERT_ICON_SIZE = 14;

const SnippetView = ({ snippet }: Props): ReactElement | null => {
  if (snippet.kind === "error") {
    return (
      <p className="ins-error" role="alert">
        <Icon name="alert" size={ALERT_ICON_SIZE} />
        <span>{snippet.message}</span>
      </p>
    );
  }

  if (snippet.kind === "loading") {
    return <p className="ins-hint">{copy.loadingSource}</p>;
  }

  return (
    <>
      {!snippet.isExact && (
        <p className="ins-note ins-code-note">{copy.noSourceLocationThisIs}</p>
      )}
      <SnippetCode code={snippet.code} />
    </>
  );
};

export { SnippetView };
