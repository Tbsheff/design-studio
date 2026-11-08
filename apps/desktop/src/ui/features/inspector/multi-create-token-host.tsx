import { Suspense } from "react";
import type { ReactElement } from "react";

import { CreateTokenDialog } from "./deps.js";
import type { DesignTokens, DirectEdit } from "./deps.js";
import { useMultiTokenSubmit } from "./use-multi-token-submit.js";
import type { CreateRequest } from "./use-token-snap.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly tokens: DesignTokens | null;
  readonly edit: DirectEdit;
  readonly request: CreateRequest | null;
  readonly onClose: () => void;
}

const MultiCreateTokenHost = ({
  projectId,
  directionId,
  tokens,
  edit,
  request,
  onClose,
}: Props): ReactElement | null => {
  const handleSubmit = useMultiTokenSubmit({
    directionId,
    edit,
    projectId,
    request,
    tokens,
  });

  if (!tokens || !request) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CreateTokenDialog
        request={request}
        entries={tokens.entries}
        onSubmit={handleSubmit}
        onClose={onClose}
      />
    </Suspense>
  );
};

export { MultiCreateTokenHost };
