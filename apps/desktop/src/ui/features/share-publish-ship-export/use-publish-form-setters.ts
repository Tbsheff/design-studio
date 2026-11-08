import { useCallback } from "react";

import type { PublishExpiryDays } from "../../../shared/publish.js";
import type { PublishFormPatch } from "./publish-types.js";

interface PublishFormSetters {
  readonly setPasswordOn: (isPasswordOn: boolean) => void;
  readonly setPassword: (password: string) => void;
  readonly setExpiry: (expiry: PublishExpiryDays) => void;
  readonly setComments: (hasComments: boolean) => void;
  readonly setViewerComments: (hasViewerComments: boolean) => void;
  readonly setIndexable: (isIndexable: boolean) => void;
}

const usePublishFormSetters = (
  onPatch: (patch: PublishFormPatch) => void
): PublishFormSetters => {
  const setPasswordOn = useCallback(
    (isPasswordOn: boolean): void => {
      onPatch({ isPasswordOn });
    },
    [onPatch]
  );

  const setPassword = useCallback(
    (password: string): void => {
      onPatch({ password });
    },
    [onPatch]
  );

  const setExpiry = useCallback(
    (expiry: PublishExpiryDays): void => {
      onPatch({ expiry });
    },
    [onPatch]
  );

  const setComments = useCallback(
    (hasComments: boolean): void => {
      onPatch({ hasComments });
    },
    [onPatch]
  );

  const setViewerComments = useCallback(
    (hasViewerComments: boolean): void => {
      onPatch({ hasViewerComments });
    },
    [onPatch]
  );

  const setIndexable = useCallback(
    (isIndexable: boolean): void => {
      onPatch({ isIndexable });
    },
    [onPatch]
  );

  return {
    setComments,
    setExpiry,
    setIndexable,
    setPassword,
    setPasswordOn,
    setViewerComments,
  };
};

export { usePublishFormSetters };
