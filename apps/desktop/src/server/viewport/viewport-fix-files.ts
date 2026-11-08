import { readFile } from "node:fs/promises";
import path from "node:path";

import { Effect } from "effect";

import {
  parseDirectEditRequest,
  patchSource,
  resolveSource,
  themeForFile,
  toDirectEditStatusFailure,
} from "../direct-edit/index.js";
import type { WrittenFile } from "../direct-edit/index.js";
import { attemptKnown } from "./deps.js";
import type { KnownFailure } from "./deps.js";
import { toOffset, toStyledHtml } from "./engine/fix-style.js";
import type { SiteScope } from "./viewport-fix-site.js";
import type { FixEdit, FixPlan } from "./viewport-fix-types.js";

type PatchTheme = Awaited<ReturnType<typeof themeForFile>>;

interface FileGroup {
  readonly edits: FixEdit[];
  readonly file: string;
  readonly relative: string;
}

const HTML_EXTENSIONS: ReadonlySet<string> = new Set([".htm", ".html"]);

const runEdit = <Value>(
  task: () => Value
): Effect.Effect<Value, KnownFailure> =>
  attemptKnown(() => Promise.resolve(task()), toDirectEditStatusFailure);

const toEditGroups = Effect.fn("toEditGroups")(function* run(
  scope: SiteScope,
  plan: FixPlan
) {
  const groups = new Map<string, FileGroup>();

  for (const edit of plan.edits) {
    const resolved = yield* attemptKnown(
      () => resolveSource(scope.workTree, edit.loc.file),
      toDirectEditStatusFailure
    );

    const group = groups.get(resolved.file) ?? {
      edits: [],
      file: resolved.file,
      relative: resolved.relative,
    };

    group.edits.push(edit);
    groups.set(resolved.file, group);
  }

  return [...groups.values()];
});

const applyEdit = Effect.fn("applyEdit")(function* run(
  group: FileGroup,
  code: string,
  theme: PatchTheme,
  edit: FixEdit
) {
  const request = parseDirectEditRequest({
    classes: { add: edit.add, remove: [] },
    selector: "",
    source: edit.loc,
  });

  const patch = yield* runEdit(() =>
    patchSource(group.relative, code, request, theme)
  );

  return patch.code;
});

const applyEdits = Effect.fn("applyEdits")(function* run(
  scope: SiteScope,
  group: FileGroup,
  original: string
) {
  const theme = yield* attemptKnown(
    () =>
      themeForFile(scope.workTree, group.relative, original, {
        projectKind: scope.projectKind,
      }),
    toDirectEditStatusFailure
  );

  const ordered = group.edits
    .filter((edit) => edit.add.length > 0)
    .toSorted(
      (left, right) =>
        toOffset(original, right.loc.line, right.loc.col) -
        toOffset(original, left.loc.line, left.loc.col)
    );

  let code = original;

  for (const edit of ordered) {
    code = yield* applyEdit(group, code, theme, edit);
  }

  return code;
});

const createGroupFile = Effect.fn("createGroupFile")(function* run(
  scope: SiteScope,
  group: FileGroup
) {
  const original = yield* attemptKnown(() => readFile(group.file, "utf-8"));
  const patched = yield* applyEdits(scope, group, original);
  let code = patched;

  if (HTML_EXTENSIONS.has(path.extname(group.file).toLowerCase())) {
    code = toStyledHtml(
      patched,
      group.edits.flatMap((edit) => edit.lines)
    );
  }

  const written: WrittenFile = {
    code,
    original,
    target: { file: group.file, relative: group.relative },
  };

  return written;
});

const createFixFiles = Effect.fn("createFixFiles")(function* run(
  scope: SiteScope,
  plan: FixPlan
) {
  const groups = yield* toEditGroups(scope, plan);
  const files: WrittenFile[] = [];

  for (const group of groups) {
    const written = yield* createGroupFile(scope, group);

    if (written.code !== written.original) {
      files.push(written);
    }
  }

  return files;
});

export { createFixFiles };
