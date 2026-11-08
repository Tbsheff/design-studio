import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { EMPTY_DRAFT, isDraftReady, isNameValid } from "./integration-model.js";
import type {
  IntegrationDraft,
  IntegrationTransport,
} from "./integration-model.js";

interface IntegrationForm {
  readonly draft: IntegrationDraft;
  readonly handleDraft: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleTransport: (transport: IntegrationTransport) => void;
  readonly isNameBad: boolean;
  readonly isReady: boolean;
}

const useIntegrationForm = (
  onCreate: (draft: IntegrationDraft) => void
): IntegrationForm => {
  const [draft, setDraft] = useState<IntegrationDraft>(EMPTY_DRAFT);

  const handleDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { name, value } = event.currentTarget;

      setDraft((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleTransport = useCallback(
    (transport: IntegrationTransport): void =>
      setDraft((prev) => ({ ...prev, transport })),
    []
  );

  const isReady = isDraftReady(draft);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (isReady) {
        onCreate(draft);
      }
    },
    [draft, isReady, onCreate]
  );

  const isNameBad = draft.name !== "" && !isNameValid(draft.name);

  return {
    draft,
    handleDraft,
    handleSubmit,
    handleTransport,
    isNameBad,
    isReady,
  };
};

export { useIntegrationForm };

export type { IntegrationForm };
