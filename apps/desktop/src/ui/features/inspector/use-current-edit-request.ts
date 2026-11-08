import type {
  DirectEditRequest,
  SelectionContext,
} from "@design-studio/contracts";

import type { StyleValues } from "./css-value-model.js";
import { createEditRequest } from "./edit-request-model.js";
import { editVariantStore } from "./use-edit-variant.js";

const createCurrentEditRequest = (
  selection: SelectionContext,
  style: Partial<StyleValues>
): DirectEditRequest | null =>
  createEditRequest(selection, style, null, editVariantStore.get());

export { createCurrentEditRequest };
