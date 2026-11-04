import { Schema } from "effect";

import {
  ACCESSIBILITY_LABEL_MAX,
  ACCESSIBILITY_ROLES,
  TAB_INDEX_MAX,
  TAB_INDEX_MIN,
} from "../accessibility/deps.js";
import { AccessibilityError } from "../accessibility/errors.js";
import { DEFAULT_VIEWPORT, frameOf } from "../accessibility/frame.js";
import type { AccessibilityFrame } from "../accessibility/frame.js";
import {
  INSPECT_ACCESSIBILITY_DESCRIPTION,
  NO_ACCESSIBILITY_CHANGE,
  SET_ACCESSIBILITY_DESCRIPTION,
  toAccessibilityChanges,
} from "../accessibility/input.js";
import { inspectAccessibility } from "../accessibility/inspect.js";
import {
  planAccessibility,
  toAccessibilityResult,
} from "../accessibility/set.js";
import type { AccessibilityTarget } from "../accessibility/set.js";
import {
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import { readDesignSystemState } from "../design-system/state.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/commit/index.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
import { describeElements } from "../page-probe/index.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

type Located =
  | { message: string; ok: false }
  | { ok: true; target: AccessibilityTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;
const FRAME_MAX = 60;

const LOC = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const NO_PREVIEW =
  "Preview is not running for this direction. Pass targetSource instead.";

const pathField = Schema.optionalKey(
  toTrimmedText(0, PATH_MAX).annotate({
    description:
      "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page).",
  })
);

const toSelectorField = (
  description: string
): Schema.optionalKey<Schema.Trim> =>
  Schema.optionalKey(toTrimmedText(1, SELECTOR_MAX).annotate({ description }));

const tabIndexRange = Schema.isBetween({
  maximum: TAB_INDEX_MAX,
  minimum: TAB_INDEX_MIN,
});

const tabIndexValue = Schema.Int.check(tabIndexRange);

const accessibilityText = Schema.optionalKey(
  Schema.NullOr(toTrimmedText(0, ACCESSIBILITY_LABEL_MAX))
);

const inspectAccessibilityFieldSet = {
  frame: Schema.optionalKey(
    toTrimmedText(1, FRAME_MAX).annotate({
      description:
        "Canvas frame id or @label. Its page and size are used. Leave out for path.",
    })
  ),
  includePassing: Schema.optionalKey(
    Schema.Boolean.annotate({
      description: "Also list the contrast pairs that pass. Default false.",
    })
  ),
  path: pathField,
  targetSelector: toSelectorField(
    "CSS selector or layer id of one layer. Leave out to check the whole page."
  ),
};

const setAccessibilityFieldSet = {
  alt: accessibilityText.annotate({
    description:
      'Alt text of an image. "" marks a decorative image. null removes it.',
  }),
  ariaLabel: Schema.optionalKey(
    Schema.NullOr(toTrimmedText(1, ACCESSIBILITY_LABEL_MAX)).annotate({
      description: 'aria-label, for example "Close dialog". null removes it.',
    })
  ),
  path: pathField,
  role: Schema.optionalKey(
    Schema.NullOr(Schema.Literals(ACCESSIBILITY_ROLES)).annotate({
      description: "ARIA role, for example button. null removes it.",
    })
  ),
  tabIndex: Schema.optionalKey(
    Schema.NullOr(tabIndexValue).annotate({
      description:
        "tabIndex: 0 puts the layer in the tab order, -1 takes it out. null removes it.",
    })
  ),
  targetSelector: toSelectorField(
    "CSS selector or layer id of the layer on the live page."
  ),
  targetSource: Schema.optionalKey(
    toTrimmedText(0, SOURCE_MAX).annotate({
      description:
        'Or the layer as file:line:col, for example "src/App.tsx:12:7".',
    })
  ),
};

const inspectAccessibilityInput = toSdkFieldSet(inspectAccessibilityFieldSet);
const setAccessibilityInput = toSdkFieldSet(setAccessibilityFieldSet);

const inspectSchema = toToolInput(inspectAccessibilityFieldSet);
const setSchema = toToolInput(setAccessibilityFieldSet);

const inspectAccessibilityDescription = INSPECT_ACCESSIBILITY_DESCRIPTION;

const setAccessibilityDescription = SET_ACCESSIBILITY_DESCRIPTION;

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolText =>
  refuse(`${tool}: ${error}`);

const caught = (tool: string, error: Error | null): ToolText => {
  if (error instanceof AccessibilityError || error instanceof DirectEditError) {
    return refuse(`${tool}: ${error.message}`);
  }

  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const scopeOf = (deps: DirectToolDeps): BreakpointScope => ({
  direction: deps.ctx.direction,
  project: deps.ctx.project,
  workTree: deps.ctx.direction.workTree,
});

const frameFor = async (
  deps: DirectToolDeps,
  ref: string | undefined
): Promise<AccessibilityFrame | null> => {
  if (!ref) {
    return null;
  }

  return frameOf(await canvasFrames(deps), ref);
};

const inspectWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof inspectSchema>
): Promise<ToolText> => {
  if (!deps.ctx.previewUrl) {
    return refuse("Preview is not running for this direction.");
  }

  const frame = await frameFor(deps, input.frame);
  const page = frame?.page ?? input.path;
  const address = editPageUrl(deps.ctx, page);

  const state = await readDesignSystemState(
    deps.ctx.project,
    deps.ctx.direction
  );

  const report = await inspectAccessibility(deps.preview, state.entries, {
    frame: frame?.id ?? input.frame ?? "f1",
    page: page ?? "/",
    passing: input.includePassing ?? false,
    root: input.targetSelector ?? null,
    url: address,
    viewport: frame?.viewport ?? DEFAULT_VIEWPORT,
  });

  return reply(JSON.stringify(report));
};

const runInspectAccessibility = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof inspectSchema>
): Promise<ToolText> => {
  const parsed = inspectSchema.safeParse(args);

  if (!parsed.success) {
    return issues("inspect_accessibility", parsed.error);
  }

  try {
    return await inspectWith(deps, parsed.data);
  } catch (error) {
    return caught("inspect_accessibility", error as Error | null);
  }
};

const fromSource = (raw: string): Located => {
  const groups = LOC.exec(raw)?.groups;

  if (!groups) {
    return { message: "targetSource must be file:line:col.", ok: false };
  }

  return {
    ok: true,
    target: {
      source: {
        col: Number(groups.col),
        file: groups.file ?? "",
        line: Number(groups.line),
      },
      tag: null,
      usedAt: null,
    },
  };
};

const locate = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof setSchema>
): Promise<Located> => {
  if (input.targetSource) {
    return fromSource(input.targetSource);
  }

  if (!deps.ctx.previewUrl) {
    return { message: NO_PREVIEW, ok: false };
  }

  const sel = input.targetSelector ?? "";
  const url = editPageUrl(deps.ctx, input.path);
  const [element] = await describeElements(deps.preview, url, [sel]);

  if (!element) {
    return { message: `No element matches ${sel} on the page.`, ok: false };
  }

  if (!element.source) {
    return { message: NO_SOURCE, ok: false };
  }

  return {
    ok: true,
    target: {
      source: element.source,
      tag: element.tag,
      usedAt: element.usedAt ?? null,
    },
  };
};

const writeAll = async (
  deps: DirectToolDeps,
  written: readonly WrittenFile[]
): Promise<string | null> => {
  const problem = written
    .map((entry) => writeProblem(deps.ctx, entry.target.relative))
    .find((entry) => entry !== null);

  if (problem) {
    return problem;
  }

  await Promise.all(
    written.map((entry) => writeAtomic(entry.target.file, entry.code))
  );

  return null;
};

const setWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof setSchema>
): Promise<ToolText> => {
  const changes = toAccessibilityChanges(input);

  if (changes === null) {
    return refuse(NO_ACCESSIBILITY_CHANGE);
  }

  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planAccessibility(scopeOf(deps), {
    changes,
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toAccessibilityResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetAccessibility = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_accessibility");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_accessibility", parsed.error);
  }

  if (
    Boolean(parsed.data.targetSelector) === Boolean(parsed.data.targetSource)
  ) {
    return refuse(ONE_TARGET);
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_accessibility", error as Error | null);
  }
};

export {
  inspectAccessibilityDescription,
  inspectAccessibilityInput,
  runInspectAccessibility,
  runSetAccessibility,
  setAccessibilityDescription,
  setAccessibilityInput,
};
