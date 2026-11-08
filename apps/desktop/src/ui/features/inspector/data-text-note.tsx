import type { SelectionContext, TextFromData } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { DataTextAsk } from "./data-text-ask.js";
import type { TextEditScope } from "./inspector-shared-model.js";
import { SourceTextRow } from "./source-text-row.js";
import { useTextSource } from "./use-text-source.js";

interface Props {
  readonly data: TextFromData;
  readonly selection: SelectionContext;
  readonly edit: TextEditScope;
}

const DataTextNote = ({ data, selection, edit }: Props): ReactElement => {
  const answer = useTextSource(edit, selection);

  if (answer && "found" in answer) {
    return <SourceTextRow found={answer.found} edit={edit} />;
  }

  if (!answer && edit.scope.directionId && selection.source) {
    return (
      <output className="ins-data-text wide">
        <span>{copy.lookingForWhereThisText}</span>
      </output>
    );
  }

  let reason: string | null = null;

  if (answer && "reason" in answer) {
    ({ reason } = answer);
  }

  return <DataTextAsk data={data} text={selection.text} reason={reason} />;
};

export { DataTextNote };
