import type { TextFromData } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  toDataTextPrompt,
  toShortLoc,
  toSharedText,
  toSourceLoc,
} from "./inspector-shared-model.js";
import { useInspectorApp } from "./use-inspector-app.js";

interface Props {
  readonly data: TextFromData;
  readonly text: string;
  readonly reason: string | null;
}

const ICON_SIZE = 12;

const DataTextAsk = ({ data, text, reason }: Props): ReactElement => {
  const { ask } = useInspectorApp();

  const handleAsk = useCallback((): void => {
    ask?.(toDataTextPrompt(text, data));
  }, [ask, data, text]);

  return (
    <div className="ins-data-text wide" role="note">
      <span>
        {copy.thisTextComesFromData}
        <code>{data.expression}</code> {copy.in}{" "}
        <code data-tip={toSourceLoc(data)}>{toShortLoc(data)}</code>
        {copy.text4}
        {toSharedText(reason)}
      </span>
      {ask && (
        <button type="button" className="btn small ghost" onClick={handleAsk}>
          <Icon name="chat" size={ICON_SIZE} />
          {copy.askTheAgentToChange}
        </button>
      )}
    </div>
  );
};

export { DataTextAsk };
