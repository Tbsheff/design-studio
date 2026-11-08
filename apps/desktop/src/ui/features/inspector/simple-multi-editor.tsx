import type { SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";

import type { StyleValues } from "./css-values.js";
import { MultiCreateTokenHost } from "./inspector-multi.js";
import { useInspectorTokens } from "./inspector-tokens.js";
import type { ScopeInput } from "./inspector-tokens.js";
import type { EditorProps } from "./simple-model.js";
import { SimpleMultiBody } from "./simple-multi-body.js";
import { useDirectEdits } from "./use-direct-edits.js";
import { TokenUiContext } from "./use-token-snap.js";

const SimpleMultiEditor = (
  props: EditorProps & { readonly component: ReactNode }
): ReactElement => {
  const first = props.selection[0] as SelectionContext;

  const scope: ScopeInput = {
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    projectId: props.projectId,
    selection: first,
    tokens: props.tokens,
  };

  const tokens = useInspectorTokens(scope);

  const edit = useDirectEdits({
    control: props.control,
    directionId: props.directionId,
    onCommitted: props.onCommitted,
    onStale: props.onStale,
    port: props.port,
    projectId: props.projectId,
    rewrite: tokens.ui && tokens.snap.rewrite,
    selections: props.selection,
  });

  const keepRaw = useCallback(
    (raw: Partial<StyleValues>) => {
      tokens.snap.keepRaw(raw);
      edit.preview(raw);
      edit.commit();
    },
    [tokens.snap, edit]
  );

  const handleClose = tokens.closeCreate;

  return (
    <TokenUiContext.Provider value={tokens.ui}>
      <SimpleMultiBody
        props={props}
        component={props.component}
        edit={edit}
        tokens={tokens}
        keepRaw={keepRaw}
      />
      <MultiCreateTokenHost
        projectId={props.projectId}
        directionId={props.directionId}
        tokens={props.tokens}
        edit={edit}
        request={tokens.creating}
        onClose={handleClose}
      />
    </TokenUiContext.Provider>
  );
};

export { SimpleMultiEditor };
