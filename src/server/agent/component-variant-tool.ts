import { z } from "zod";

import type { ComponentVariantChange } from "../../shared/component-variant.js";
import type { VariantScope } from "../components/variant-write/locate.js";
import type { VariantPlan } from "../components/variant-write/plan.js";
import { planVariantWrite } from "../components/variant-write/plan.js";
import {
  previewVariant,
  toVariantResult,
} from "../components/variant-write/write.js";
import type { VariantPreview } from "../components/variant-write/write.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import {
  createChange,
  createFields,
  hasComponent,
  targetOf,
  updateChange,
  updateFields,
} from "../mcp/component-variant-tools.js";
import type {
  CreateFields,
  UpdateFields,
} from "../mcp/component-variant-tools.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

type ToolContent =
  | { data: string; mimeType: string; type: "image" }
  | { text: string; type: "text" };

interface ToolReply {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const createVariantInput = { ...createFields };

const updateVariantInput = { ...updateFields };

const createSchema = z.strictObject(createVariantInput);
const updateSchema = z.strictObject(updateVariantInput);

const refuse = (message: string): ToolReply => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: z.ZodError): ToolReply => {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
  );

  return refuse(`${tool}: ${lines.join("; ")}`);
};

const caught = (tool: string, error: Error | null): ToolReply => {
  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const scopeOf = (deps: DirectToolDeps): VariantScope => ({
  direction: deps.ctx.direction,
  project: deps.ctx.project,
  workTree: deps.ctx.direction.workTree,
});

const imageOf = (preview: VariantPreview): ToolContent[] => {
  if (!preview.ok) {
    return [];
  }

  return [
    {
      data: preview.png.toString("base64"),
      mimeType: "image/png",
      type: "image",
    },
  ];
};

const writeAll = async (
  deps: DirectToolDeps,
  plan: VariantPlan
): Promise<string | null> => {
  const problem = plan.written
    .map((entry) => writeProblem(deps.ctx, entry.target.relative))
    .find((entry) => entry !== null);

  if (problem) {
    return problem;
  }

  await Promise.all(
    plan.written.map((entry) => writeAtomic(entry.target.file, entry.code))
  );

  return null;
};

const writeWith = async (
  deps: DirectToolDeps,
  input: CreateFields | UpdateFields,
  change: ComponentVariantChange
): Promise<ToolReply> => {
  const scope = scopeOf(deps);

  const plan = await planVariantWrite(scope, {
    change,
    target: targetOf(input),
  });

  const problem = await writeAll(deps, plan);

  if (problem) {
    return refuse(problem);
  }

  const preview = await previewVariant(deps.preview, scope, plan);
  const result = JSON.stringify(toVariantResult(plan, null, preview));

  return {
    content: [
      ...imageOf(preview),
      { text: `${plan.title}. ${RUN_NOTE} ${result}`, type: "text" },
    ],
  };
};

const preflight = (deps: DirectToolDeps, tool: string): string | null => {
  const blocked = refusal(deps.ctx, tool);

  if (blocked) {
    return blocked;
  }

  if (deps.ctx.project.kind !== "react") {
    return "This is an HTML project. It has no component kit.";
  }

  return null;
};

const runVariantWrite = async <Fields extends CreateFields | UpdateFields>(
  deps: DirectToolDeps,
  tool: string,
  parsed: z.ZodSafeParseResult<Fields>,
  changeOf: (input: Fields) => ComponentVariantChange
): Promise<ToolReply> => {
  const blocked = preflight(deps, tool);

  if (blocked) {
    return refuse(blocked);
  }

  if (!parsed.success) {
    return issues(tool, parsed.error);
  }

  if (!hasComponent(parsed.data)) {
    return refuse("Pass the component name or its file.");
  }

  try {
    return await writeWith(deps, parsed.data, changeOf(parsed.data));
  } catch (error) {
    return caught(tool, error as Error | null);
  }
};

const runCreateComponentVariant = (
  deps: DirectToolDeps,
  args: z.input<typeof createSchema>
): Promise<ToolReply> =>
  runVariantWrite(
    deps,
    "create_component_variant",
    createSchema.safeParse(args),
    createChange
  );

const runUpdateComponentVariant = (
  deps: DirectToolDeps,
  args: z.input<typeof updateSchema>
): Promise<ToolReply> =>
  runVariantWrite(
    deps,
    "update_component_variant",
    updateSchema.safeParse(args),
    updateChange
  );

export {
  createVariantInput,
  runCreateComponentVariant,
  runUpdateComponentVariant,
  updateVariantInput,
};
