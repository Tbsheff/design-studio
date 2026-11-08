import type { AnyAction } from "@design-studio/actions/_core/action";
import type { StudioError } from "@design-studio/actions/_core/errors/all";
import { ImageOutputSchema } from "@design-studio/actions/_core/image-output";
import { Exit, Schema } from "effect";

import { failureOf, toWireError } from "../handlers/_core/wire-error.js";
import { toDecoder } from "../platform/decode/index.js";
import { RUN_BUSY } from "./edit-guards.js";
import { mcpErrorText } from "./error-copy.js";

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

type ImageOutput = typeof ImageOutputSchema.Type;

type ActionExit = Exit.Exit<object, StudioError>;

const textResult = (text: string, isError: boolean): TextResult => ({
  content: [{ text, type: "text" }],
  isError,
});

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

const PageSchema = Schema.Struct({
  items: Schema.Array(Schema.Json),
  next: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const LinkListSchema = Schema.Struct({
  items: Schema.Array(Schema.Json),
  note: Schema.NullOr(Schema.String),
  startFrame: Schema.String,
});

const readLastPage = toDecoder(PageSchema, "error");

const readLinkList = toDecoder(LinkListSchema, "ignore");

const toLegacyValue = (value: Schema.Json): Schema.Json => {
  const list = readLinkList(value);

  if (list._tag === "Success") {
    const { items, note, startFrame } = list.success;

    const base = { links: items, startFrame };

    if (note === null) {
      return base;
    }

    return { ...base, note };
  }

  const page = readLastPage(value);

  if (page._tag === "Success") {
    const { items } = page.success;
    const next = page.success.next ?? null;

    if (next === null) {
      return items;
    }

    return { items, next };
  }

  return value;
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

  return (
    toRawText(actionId, parsed.success) ??
    JSON.stringify(toLegacyValue(parsed.success))
  );
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

  return textResult(mcpErrorText(wire.body.message), true);
};

export { textResult, toToolResult };

export type { ActionExit, TextResult };
