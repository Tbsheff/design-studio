import type { TokenChange } from "@design-studio/contracts";

import { api, errorText } from "../../api.js";
import { errorPaths } from "./token-draft.js";
import type { PendingMap } from "./token-draft.js";

const MAX_PREVIEW_TRIES = 4;
const NO_PATH = "";

type ErrorMap = Record<string, string>;

interface PreviewOutcome {
  readonly css: string | null;
  readonly errors: ErrorMap;
}

interface PreviewScope {
  readonly directionId: string;
  readonly good: PendingMap;
  readonly projectId: string;
}

interface PreviewReply {
  readonly css: string;
  readonly messages: string[];
}

const substitute = (
  changes: TokenChange[],
  bad: ErrorMap,
  good: PendingMap
): TokenChange[] =>
  changes.flatMap((change) => {
    if (!(change.path in bad)) {
      return [change];
    }

    const last = good[change.path];

    const same =
      last &&
      last.value === change.value &&
      last.darkValue === change.darkValue;

    if (last && !same) {
      return [{ path: change.path, ...last }];
    }

    return [];
  });

const requestPreview = async (
  scope: PreviewScope,
  changes: TokenChange[]
): Promise<PreviewReply> => {
  try {
    const result = await api.previewTokens(
      scope.projectId,
      scope.directionId,
      changes
    );

    return { css: result.css, messages: result.errors };
  } catch (error) {
    return { css: "", messages: [errorText(error as Error)] };
  }
};

const markGood = (good: PendingMap, changes: TokenChange[]): void => {
  for (const change of changes) {
    good[change.path] = {
      darkValue: change.darkValue,
      value: change.value,
    };
  }
};

const previewAttempt = async (
  scope: PreviewScope,
  rest: TokenChange[],
  errors: ErrorMap,
  attempt: number
): Promise<PreviewOutcome> => {
  if (attempt >= MAX_PREVIEW_TRIES || rest.length === 0) {
    if (rest.length === 0) {
      return { css: "", errors };
    }

    return { css: null, errors };
  }

  const reply = await requestPreview(scope, rest);

  if (reply.messages.length === 0) {
    markGood(scope.good, rest);

    return { css: reply.css, errors };
  }

  const bad = errorPaths(reply.messages, rest);

  if (Object.keys(bad).length === 0) {
    return {
      css: null,
      errors: { ...errors, [NO_PATH]: reply.messages.join("; ") },
    };
  }

  return previewAttempt(
    scope,
    substitute(rest, bad, scope.good),
    { ...errors, ...bad },
    attempt + 1
  );
};

const previewWithFallback = (
  scope: PreviewScope,
  changes: TokenChange[]
): Promise<PreviewOutcome> => previewAttempt(scope, changes, {}, 0);

export { previewWithFallback };

export type { ErrorMap, PreviewOutcome, PreviewScope };
