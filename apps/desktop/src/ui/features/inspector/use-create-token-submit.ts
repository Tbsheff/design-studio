import type {
  CreateTokenRequest,
  CreateTokenResult,
  DirectEditRequest,
  SelectionContext,
} from "@design-studio/contracts";
import { useCallback } from "react";

import { cssVarFor } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { StyleValues } from "./css-value-model.js";
import type { CreateTokenSubmit, DesignTokens } from "./deps.js";
import { buildEditRequest } from "./use-direct-edit.js";
import type { DirectEdit, DirectEditCommit } from "./use-direct-edit.js";
import type { CreateRequest } from "./use-token-snap.js";

interface SubmitInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly onCommitted: (commit: DirectEditCommit) => void;
  readonly tokens: DesignTokens;
  readonly request: CreateRequest;
  readonly edit: DirectEdit;
}

const toApply = (
  isApplied: boolean,
  selection: SelectionContext,
  style: Partial<StyleValues>
): DirectEditRequest | null => {
  if (isApplied) {
    return buildEditRequest(selection, style);
  }

  return null;
};

const useCreateTokenSubmit = (
  input: SubmitInput
): ((values: CreateTokenSubmit) => Promise<CreateTokenResult>) => {
  const { projectId, directionId, selection, onCommitted } = input;
  const { tokens, request, edit } = input;

  return useCallback(
    async (values: CreateTokenSubmit): Promise<CreateTokenResult> => {
      if (!directionId) {
        throw new Error("No direction selected");
      }

      await edit.drain();
      const cssVar = cssVarFor(values.group, values.name);

      const style: Partial<StyleValues> = Object.fromEntries(
        request.targets.map((part) => [part, `var(${cssVar})`])
      );

      const apply = toApply(values.apply, selection, style);

      const body: CreateTokenRequest = {
        group: values.group,
        name: values.name,
        value: values.value,
      };

      if (values.darkValue) {
        body.darkValue = values.darkValue;
      }

      if (apply) {
        body.apply = apply;
      }

      const result = await api.createToken(projectId, directionId, body);

      tokens.replace(result.state);

      if (apply) {
        edit.absorb(style);
        onCommitted({ selector: selection.selector, style });
      }

      return result;
    },
    [projectId, directionId, selection, onCommitted, tokens, request, edit]
  );
};

export { useCreateTokenSubmit };
