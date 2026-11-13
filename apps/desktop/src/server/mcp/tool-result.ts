import type { AnyAction } from "@design-studio/actions/_core/action";
import type { StudioError } from "@design-studio/actions/_core/errors/all";
import { ImageOutputSchema } from "@design-studio/actions/_core/image-output";
import { Exit, Schema } from "effect";

import { failureOf, toWireError } from "../handlers/_core/wire-error.js";
import { toDecoder } from "../platform/decode/index.js";
import { ForbiddenError } from "../platform/errors/index.js";
import { EditError, RUN_BUSY } from "./edit-guards.js";
import { mcpErrorText } from "./error-copy.js";
import type { ErrorTag } from "./tool-types.js";

const RUN_IN_PROGRESS = "run_in_progress";

type ResultBlock =
  | { readonly text: string; readonly type: "text" }
  | {
      readonly data: string;
      readonly mimeType: string;
      readonly type: "image";
    };

type TextResult = Readonly<{
  content: ResultBlock[];
  isError: boolean;
}>;

type TaggedResult = TextResult & Readonly<{ structuredContent: ErrorTag }>;

const FORBIDDEN_TAG = "Forbidden";

const FORBIDDEN_CODES = new Set(["forbidden", FORBIDDEN_TAG]);

type ImageOutput = typeof ImageOutputSchema.Type;

type ActionExit = Exit.Exit<object, StudioError>;

const textResult = (text: string, isError: boolean): TextResult => ({
  content: [{ text, type: "text" }],
  isError,
});

const toTaggedResult = (text: string, tag: ErrorTag): TaggedResult => ({
  ...textResult(text, true),
  structuredContent: tag,
});

const isForbiddenError = (error: Error): boolean => {
  if (error instanceof ForbiddenError) {
    return true;
  }

  return error instanceof EditError && FORBIDDEN_CODES.has(error.code ?? "");
};

const toForbiddenTag = (error: Error): ErrorTag | null => {
  if (!isForbiddenError(error)) {
    return null;
  }

  return { _tag: FORBIDDEN_TAG, code: null, message: error.message };
};

const toErrorResult = (
  error: Error,
  text: string
): TaggedResult | TextResult => {
  const tag = toForbiddenTag(error);

  if (tag === null) {
    return textResult(text, true);
  }

  return toTaggedResult(text, tag);
};

const imageResult = (value: ImageOutput): TextResult => ({
  content: [
    { data: value.data, mimeType: value.mimeType, type: "image" },
    { text: value.text, type: "text" },
  ],
  isError: false,
});

const isImageAction = (action: AnyAction): boolean =>
  action.output === ImageOutputSchema;

const PREVIEW_ACTION_ID = "direct-edit.getComponentPreview";

const PREVIEW_TEXT = "Component preview.";

const PreviewOutputSchema = Schema.Struct({
  png: Schema.String,
  text: Schema.NullOr(Schema.String),
});

const readPreviewOutput = toDecoder(PreviewOutputSchema, "ignore");

const toPreviewResult = (value: Schema.Json): TextResult | null => {
  const preview = readPreviewOutput(value);

  if (preview._tag === "Failure") {
    return null;
  }

  return imageResult({
    data: preview.success.png,
    mimeType: "image/png",
    text: preview.success.text || PREVIEW_TEXT,
  });
};

const readJsonText = toDecoder(Schema.fromJsonString(Schema.Json), "ignore");

const readFileText = toDecoder(
  Schema.Struct({ text: Schema.String }),
  "ignore"
);

const readFrameHtml = toDecoder(
  Schema.Struct({ html: Schema.String }),
  "ignore"
);

const toRawText = (actionId: string, value: Schema.Json): string | null => {
  const file = readFileText(value);
  const frame = readFrameHtml(value);

  if (actionId === "workspace.getFile" && file._tag === "Success") {
    return file.success.text;
  }

  if (actionId === "workspace.getFrameHtml" && frame._tag === "Success") {
    return frame.success.html;
  }

  return null;
};

const toLegacyText = (text: string, actionId: string): string => {
  const parsed = readJsonText(text);

  if (parsed._tag === "Failure") {
    return text;
  }

  return toRawText(actionId, parsed.success) ?? JSON.stringify(parsed.success);
};

const toToolResult = (action: AnyAction, exit: ActionExit): TextResult => {
  if (Exit.isSuccess(exit) && isImageAction(action)) {
    return imageResult(exit.value as ImageOutput);
  }

  if (Exit.isSuccess(exit) && action.id === PREVIEW_ACTION_ID) {
    const preview = toPreviewResult(exit.value as Schema.Json);

    if (preview !== null) {
      return preview;
    }
  }

  if (Exit.isSuccess(exit)) {
    return textResult(
      toLegacyText(JSON.stringify(exit.value), action.id),
      false
    );
  }

  const wire = toWireError(failureOf(exit));

  if (wire.body.error === RUN_IN_PROGRESS) {
    return textResult(RUN_BUSY, true);
  }

  const text = mcpErrorText(wire.body.message);

  if (wire.body._tag === "Defect") {
    return textResult(text, true);
  }

  return toTaggedResult(text, {
    _tag: wire.body._tag,
    code: wire.body.code,
    message: wire.body.message,
  });
};

export { textResult, toErrorResult, toToolResult };

export type { ActionExit, TaggedResult, TextResult };
