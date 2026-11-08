import { Suspense } from "react";
import type { ReactElement } from "react";

import { CreateTokenDialog } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import type { ScopeInput } from "./token-scope-model.js";
import { useCreateTokenSubmit } from "./use-create-token-submit.js";
import type { CreateRequest } from "./use-token-snap.js";

type ActiveProps = ScopeInput & {
  readonly edit: DirectEdit;
  readonly request: CreateRequest;
  readonly tokens: NonNullable<ScopeInput["tokens"]>;
  readonly onClose: () => void;
};

const CreateTokenActiveHost = (props: ActiveProps): ReactElement => {
  const submit = useCreateTokenSubmit(props);

  return (
    <Suspense fallback={null}>
      <CreateTokenDialog
        request={props.request}
        entries={props.tokens.entries}
        onSubmit={submit}
        onClose={props.onClose}
      />
    </Suspense>
  );
};

export { CreateTokenActiveHost };
