import type { ReactElement } from "react";

import { CreateTokenActiveHost } from "./create-token-active-host.js";
import type { DirectEdit } from "./deps.js";
import type { ScopeInput } from "./token-scope-model.js";
import type { CreateRequest } from "./use-token-snap.js";

const CreateTokenHost = (
  props: ScopeInput & {
    readonly edit: DirectEdit;
    readonly request: CreateRequest | null;
    readonly onClose: () => void;
  }
): ReactElement | null => {
  const { tokens, request } = props;

  if (!tokens || !request) {
    return null;
  }

  return (
    <CreateTokenActiveHost
      projectId={props.projectId}
      directionId={props.directionId}
      selection={props.selection}
      tokens={tokens}
      onCommitted={props.onCommitted}
      edit={props.edit}
      request={request}
      onClose={props.onClose}
    />
  );
};

export { CreateTokenHost };
