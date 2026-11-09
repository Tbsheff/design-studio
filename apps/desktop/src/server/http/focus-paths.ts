import { Result, Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { BadRequestError } from "../platform/errors/index.js";

const FOCUS_MAX = 20;

const FOCUS_PATH_MAX = 300;

const FOCUS_PATH_PATTERN = /^(?!\/)(?!(?:.*\/)?\.\.(?:\/|$))[^\n\r<>\\]+$/u;

const FocusPathSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FOCUS_PATH_MAX),
  Schema.isPattern(FOCUS_PATH_PATTERN)
);

const FocusPathsSchema = Schema.Array(FocusPathSchema).check(
  Schema.isMaxLength(FOCUS_MAX)
);

const decodeFocusPaths = toDecoder(FocusPathsSchema, "error");

const toFocusPaths = (
  decoded: Result.Result<readonly string[], unknown>
): string[] => {
  if (Result.isFailure(decoded)) {
    throw new BadRequestError(
      `focusPaths must be up to ${FOCUS_MAX} work-tree relative paths or globs with no ..`
    );
  }

  return [...new Set(decoded.success)];
};

export { decodeFocusPaths, toFocusPaths };
