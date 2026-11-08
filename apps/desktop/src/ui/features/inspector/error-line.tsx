import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toDataTextPrompt } from "./inspector-shared-model.js";
import type { SaveStatus } from "./use-direct-edit.js";
import { useInspectorApp } from "./use-inspector-app.js";

interface ErrorLineProps {
  readonly status: SaveStatus;
  readonly text: string | null;
}

const ErrorLine = ({ status, text }: ErrorLineProps): ReactElement | null => {
  const app = useInspectorApp();

  const data =
    (status.kind === "error" &&
      status.code === "text_from_data" &&
      app.element?.textFromData) ||
    null;

  const ask = useCallback(() => {
    if (data) {
      app.ask?.(toDataTextPrompt(text ?? "", data));
    }
  }, [app, data, text]);

  if (status.kind !== "error") {
    return null;
  }

  return (
    <div className="ins-error" role="alert">
      <Icon name="alert" size={14} />
      <span>{status.message}</span>
      {data && app.ask && (
        <button
          type="button"
          className="btn small ghost ins-error-action"
          onClick={ask}
        >
          {copy.askTheAgentToChange}
        </button>
      )}
    </div>
  );
};

export { ErrorLine };
