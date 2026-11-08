import type {
  CompiledTokenEntry,
  CreateTokenResult,
  TokenGroupName,
} from "@design-studio/contracts";
import { useCallback, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { ApiError, errorText } from "../../api.js";
import { COPY } from "./copy.js";
import {
  suggestName,
  toProblems,
  toSubmitInput,
} from "./create-token-model.js";
import type {
  CreateTokenSubmit,
  TokenFailure,
  TokenProblems,
} from "./create-token-types.js";

const HTTP_CONFLICT = 409;

interface CreateTokenInput {
  readonly entries: CompiledTokenEntry[];
  readonly group: TokenGroupName;
  readonly initialValue: string;
  readonly isColor: (value: string) => boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: CreateTokenSubmit) => Promise<CreateTokenResult>;
}

interface CreateTokenForm {
  readonly apply: boolean;
  readonly busy: boolean;
  readonly dark: string;
  readonly failure: TokenFailure | null;
  readonly group: TokenGroupName;
  readonly name: string;
  readonly onName: (value: string) => void;
  readonly problems: TokenProblems;
  readonly setApply: (value: boolean) => void;
  readonly setDark: (value: string) => void;
  readonly setValue: (value: string) => void;
  readonly submit: (event: FormEvent) => void;
  readonly touched: boolean;
  readonly value: string;
}

const useCreateToken = (input: CreateTokenInput): CreateTokenForm => {
  const { entries, group, initialValue, isColor } = input;
  const { onClose, onSubmit } = input;
  const [name, setName] = useState(() => suggestName(group, entries));
  const [value, setValue] = useState(initialValue);
  const [dark, setDark] = useState("");
  const [apply, setApply] = useState(true);
  const [touched, setTouched] = useState(false);
  const [busy, startTransition] = useTransition();
  const [failure, setFailure] = useState<TokenFailure | null>(null);

  const problems = toProblems({
    dark,
    entries,
    failure,
    group,
    isColor,
    name,
    value,
  });

  const { isInvalid } = problems;

  const onName = useCallback((next: string): void => {
    setName(next.trim());
    setFailure(null);
  }, []);

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      setTouched(true);

      if (isInvalid || busy) {
        return;
      }

      setFailure(null);

      startTransition(async () => {
        try {
          await onSubmit(toSubmitInput({ apply, dark, group, name, value }));
          onClose();
        } catch (error: unknown) {
          if (
            error instanceof ApiError &&
            error.status === HTTP_CONFLICT &&
            error.code === "token_exists"
          ) {
            setFailure({ field: "name", message: error.message });
          } else {
            setFailure({
              field: "form",
              message: `${COPY.tokenCouldNot}${errorText(error)}${COPY.tokenTryAgain}`,
            });
          }
        }
      });
    },
    [apply, busy, dark, group, isInvalid, name, onClose, onSubmit, value]
  );

  return {
    apply,
    busy,
    dark,
    failure,
    group,
    name,
    onName,
    problems,
    setApply,
    setDark,
    setValue,
    submit,
    touched,
    value,
  };
};

export { useCreateToken };

export type { CreateTokenForm };
