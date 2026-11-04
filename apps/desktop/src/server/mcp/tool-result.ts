import { Exit } from "effect";

import type { AnyAction } from "@design-studio/actions/_core/action";
import type { StudioError } from "@design-studio/actions/_core/errors/all";
import { ImageOutputSchema } from "@design-studio/actions/_core/image-output";
import { failureOf, toWireError } from "../handlers/_core/wire-error.js";

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

const toToolResult = (action: AnyAction, exit: ActionExit): TextResult => {
  if (Exit.isSuccess(exit) && isImageAction(action)) {
    return imageResult(exit.value as ImageOutput);
  }

  if (Exit.isSuccess(exit)) {
    return textResult(JSON.stringify(exit.value), false);
  }

  const wire = toWireError(failureOf(exit));

  return textResult(JSON.stringify(wire.body), true);
};

export { textResult, toToolResult };

export type { ActionExit, TextResult };
