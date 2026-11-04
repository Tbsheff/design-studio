import type { AnyAction } from "@design-studio/actions/_core/action";
import type { StudioError } from "@design-studio/actions/_core/errors/all";
import { ImageOutputSchema } from "@design-studio/actions/_core/image-output";
import { Exit, Option, Schema } from "effect";

import { failureOf, toWireError } from "../handlers/_core/wire-error.js";
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

const PageSchema = Schema.Struct({
  items: Schema.Array(Schema.Json),
  next: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const LinkListSchema = Schema.Struct({
  items: Schema.Array(Schema.Json),
  note: Schema.NullOr(Schema.String),
  startFrame: Schema.String,
});

const readLastPage = Schema.decodeUnknownOption(PageSchema, {
  onExcessProperty: "error",
});

const readLinkList = Schema.decodeUnknownOption(LinkListSchema);

const toLegacyValue = (value: Schema.Json): Schema.Json => {
  const list = readLinkList(value);

  if (Option.isSome(list)) {
    const { items, note, startFrame } = list.value;

    const base = { links: items, startFrame };

    if (note === null) {
      return base;
    }

    return { ...base, note };
  }

  const page = readLastPage(value);

  if (Option.isSome(page)) {
    const { items } = page.value;
    const next = page.value.next ?? null;

    if (next === null) {
      return items;
    }

    return { items, next };
  }

  return value;
};

const readJsonText = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Json)
);

const readFileText = Schema.decodeUnknownOption(
  Schema.Struct({ text: Schema.String })
);

const readFrameHtml = Schema.decodeUnknownOption(
  Schema.Struct({ html: Schema.String })
);

const toRawText = (actionId: string, value: Schema.Json): string | null => {
  const file = readFileText(value);
  const frame = readFrameHtml(value);

  if (actionId === "workspace.getFile" && Option.isSome(file)) {
    return file.value.text;
  }

  if (actionId === "workspace.getFrameHtml" && Option.isSome(frame)) {
    return frame.value.html;
  }

  return null;
};

const toLegacyText = (text: string, actionId: string): string => {
  const parsed = readJsonText(text);

  if (Option.isNone(parsed)) {
    return text;
  }

  return (
    toRawText(actionId, parsed.value) ??
    JSON.stringify(toLegacyValue(parsed.value))
  );
};

const toToolResult = (action: AnyAction, exit: ActionExit): TextResult => {
  if (Exit.isSuccess(exit) && isImageAction(action)) {
    return imageResult(exit.value as ImageOutput);
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
