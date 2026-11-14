import { useCallback, useState, useTransition } from "react";
import type { RefObject } from "react";

import type { RouteInput } from "../../platform/http.js";
import { copy } from "./copy.js";
import { textRoutes, useAction } from "./deps.js";
import type { PreviewPort, SourceLoc } from "./deps.js";
import type { TextRangeReading } from "./text-range-model.js";
import { useTextRangeResume } from "./use-text-range-resume.js";

type TextRangeBody = RouteInput<typeof textRoutes.applyRangeText>;

type TextRangeStyle = TextRangeBody["style"];

interface TextRangeApplySetup {
  readonly directionId: string | null;
  readonly onResult: (isOk: boolean) => void;
  readonly port: RefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly selector: string | null;
  readonly source: SourceLoc | null;
}

interface TextRangeApplyInput {
  readonly isRemove: boolean;
  readonly reading: TextRangeReading;
  readonly style: TextRangeStyle;
  readonly value: string | null;
}

interface TextRangeApply {
  readonly apply: (input: TextRangeApplyInput) => void;
  readonly clear: () => void;
  readonly failure: string | null;
  readonly isPending: boolean;
}

const toFailureText = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }

  if (error.message === "") {
    return copy.failed;
  }

  return error.message;
};

const toValueFor = (
  input: TextRangeApplyInput,
  style: TextRangeStyle
): string | null => {
  if (input.style === style) {
    return input.value;
  }

  return null;
};

const toApplyBody = (
  setup: TextRangeApplySetup,
  input: TextRangeApplyInput
): TextRangeBody | null => {
  const source = input.reading.source ?? setup.source;

  if (source === null || setup.directionId === null) {
    return null;
  }

  return {
    className: toValueFor(input, "class"),
    directionId: setup.directionId,
    end: input.reading.end,
    href: toValueFor(input, "link"),
    isRemove: input.isRemove,
    layer: { column: source.col, file: source.file, line: source.line },
    projectId: setup.projectId,
    start: input.reading.start,
    style: input.style,
    text: input.reading.text,
  };
};

const toFailureOf = (
  isMissing: boolean,
  error: Error | null,
  dismissed: Error | null
): string | null => {
  if (isMissing) {
    return copy.failed;
  }

  if (error === dismissed) {
    return null;
  }

  return toFailureText(error);
};

const useTextRangeApply = (setup: TextRangeApplySetup): TextRangeApply => {
  const { onResult, port, selector } = setup;
  const [pending, startApply] = useTransition();
  const [isMissing, setIsMissing] = useState(false);
  const [dismissed, setDismissed] = useState<Error | null>(null);
  const { error, run } = useAction(textRoutes.applyRangeText);
  const { arm, drop } = useTextRangeResume(port, selector);

  const apply = useCallback(
    (input: TextRangeApplyInput): void => {
      const body = toApplyBody(setup, input);
      setIsMissing(body === null);

      if (body === null) {
        return;
      }

      arm(input.reading.layer);
      startApply(async () => {
        const result = await run(body);

        if (result === null) {
          drop();
        }

        onResult(result !== null);
      });
    },
    [arm, drop, onResult, run, setup]
  );

  const clear = useCallback((): void => {
    setIsMissing(false);
    setDismissed(error);
  }, [error]);

  return {
    apply,
    clear,
    failure: toFailureOf(isMissing, error, dismissed),
    isPending: pending,
  };
};

export { useTextRangeApply };

export type { TextRangeApply, TextRangeApplyInput, TextRangeStyle };
