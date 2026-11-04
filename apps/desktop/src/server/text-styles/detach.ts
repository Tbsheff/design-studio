import { parseDirectEditRequest, planDirectEdit } from "./deps.js";
import type {
  DirectEditRequest,
  Project,
  SourceLoc,
  WrittenFile,
} from "./deps.js";

interface TextStyleDetachTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface TextStyleDetachRequest {
  readonly styles: Readonly<Record<string, string>>;
  readonly target: TextStyleDetachTarget;
}

interface TextStyleDetachScope {
  readonly project: Project;
  readonly workTree: string;
}

const DETACH_PROPS = [
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "font-family",
] as const;

const toLiteralStyle = (
  styles: Readonly<Record<string, string>>
): Record<string, string> =>
  Object.fromEntries(
    DETACH_PROPS.flatMap((prop) => {
      const value = styles[prop]?.trim() ?? "";

      if (value === "") {
        return [];
      }

      return [[prop, value]];
    })
  );

const toRequest = (
  selector: string | null,
  source: SourceLoc,
  style: Record<string, string>,
  tag: string | null
): DirectEditRequest => {
  const base = { selector: selector ?? "", source, style };

  if (tag === null) {
    return parseDirectEditRequest(base);
  }

  return parseDirectEditRequest({ ...base, tag });
};

const createTextStyleDetach = async (
  scope: TextStyleDetachScope,
  request: TextStyleDetachRequest
): Promise<WrittenFile> => {
  const { selector, source, tag } = request.target;

  const style = toLiteralStyle(request.styles);

  const parsed = toRequest(selector, source, style, tag);

  const planned = await planDirectEdit(scope.workTree, parsed, null, {
    projectKind: scope.project.kind,
  });

  return {
    code: planned.patch.code,
    original: planned.original,
    target: planned.target,
  };
};

export { createTextStyleDetach };

export type { TextStyleDetachRequest, TextStyleDetachScope };
