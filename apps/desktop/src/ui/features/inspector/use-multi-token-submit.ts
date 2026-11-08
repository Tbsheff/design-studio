import type {
  CreateTokenRequest,
  CreateTokenResult,
} from "@design-studio/contracts";
import { useCallback } from "react";

import { cssVarFor } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { StyleValues } from "./css-value-model.js";
import type { CreateTokenSubmit, DesignTokens, DirectEdit } from "./deps.js";
import type { CreateRequest } from "./use-token-snap.js";

interface SubmitOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly tokens: DesignTokens | null;
  readonly edit: DirectEdit;
  readonly request: CreateRequest | null;
}

const toTokenBody = (input: CreateTokenSubmit): CreateTokenRequest => {
  const base = { group: input.group, name: input.name, value: input.value };

  if (input.darkValue) {
    return { ...base, darkValue: input.darkValue };
  }

  return base;
};

const useMultiTokenSubmit = (
  options: SubmitOptions
): ((input: CreateTokenSubmit) => Promise<CreateTokenResult>) => {
  const { projectId, directionId, tokens, edit, request } = options;

  return useCallback(
    async (input: CreateTokenSubmit): Promise<CreateTokenResult> => {
      if (!directionId || !tokens || !request) {
        throw new Error("No direction selected");
      }

      await edit.drain();

      const result = await api.createToken(
        projectId,
        directionId,
        toTokenBody(input)
      );

      tokens.replace(result.state);

      if (input.apply) {
        const cssVar = cssVarFor(input.group, input.name);

        const style: Partial<StyleValues> = Object.fromEntries(
          request.targets.map((part) => [part, `var(${cssVar})`])
        );

        edit.preview(style);
        edit.commit();
      }

      return result;
    },
    [directionId, edit, projectId, request, tokens]
  );
};

export { useMultiTokenSubmit };
