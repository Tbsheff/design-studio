import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { CodeEdit } from "./use-code-edit.js";

interface Props {
  readonly edit: CodeEdit;
  readonly file: string;
  readonly line: number;
}

const CodeEditEditor = lazy(async () => {
  const loaded = await import("./code-edit-editor.js");

  return { default: loaded.CodeEditEditor };
});

const CodeEditBody = ({ edit, file, line }: Props): ReactElement => {
  const { status, initialText } = edit;

  if (status.kind === "error") {
    return (
      <p className="ins-error" role="alert">
        {status.message}
      </p>
    );
  }

  if (initialText === null) {
    return <p className="ins-hint">{copy.codeEditLoading}</p>;
  }

  return (
    <Suspense fallback={null}>
      <CodeEditEditor
        key={edit.generation}
        file={file}
        initialText={initialText}
        line={line}
        onChange={edit.handleChange}
        onSave={edit.handleSave}
      />
    </Suspense>
  );
};

export { CodeEditBody };
