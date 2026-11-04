import {
  assertCanEdit,
  componentPreviewsFor,
  publishVersion,
  writeAndCommitAll,
} from "./deps.js";
import type {
  ComponentVariantRequest,
  ComponentVariantResult,
  DirectEditDeps,
  PreviewService,
  Version,
} from "./deps.js";
import type { VariantScope } from "./locate.js";
import { planVariantWrite } from "./plan.js";
import type { VariantPlan } from "./plan.js";

interface VariantDone {
  readonly plan: VariantPlan;
  readonly version: Version;
}

type VariantPreview =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly png: Buffer };

const LAG_NOTE =
  "The preview can show the old classes until the dev server rebuilds its CSS.";

const recordHistory = (
  deps: DirectEditDeps,
  scope: VariantScope,
  plan: VariantPlan,
  version: Version
): void => {
  deps.history?.record({
    directionId: scope.direction.id,
    files: plan.written.map((entry) => ({
      after: entry.code,
      before: entry.original,
      file: entry.target.file,
      relative: entry.target.relative,
    })),
    label: version.title,
    projectId: scope.project.id,
    versionId: version.id,
  });
};

const commitVariant = async (
  deps: DirectEditDeps,
  scope: VariantScope,
  plan: VariantPlan
): Promise<Version> => {
  const { direction, project } = scope;
  const files = plan.written.map((entry) => entry.target.relative).join(", ");

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    plan.written,
    plan.title,
    { kind: "manual", prompt: `${plan.title}: ${files}` }
  );

  recordHistory(deps, scope, plan, version);
  await publishVersion(deps, project, direction, version);

  return version;
};

const writeVariant = async (
  deps: DirectEditDeps,
  scope: VariantScope,
  request: ComponentVariantRequest
): Promise<VariantDone> => {
  assertCanEdit(deps, scope.project, scope.direction);

  const plan = await planVariantWrite(scope, request);
  const version = await commitVariant(deps, scope, plan);

  return { plan, version };
};

const reasonOf = (error: Error | null): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const renderPreview = async (
  preview: PreviewService,
  scope: VariantScope,
  plan: VariantPlan,
  componentName: string
): Promise<VariantPreview> => {
  const result = await componentPreviewsFor(preview).render(
    scope.project,
    scope.direction,
    {
      file: plan.component.file,
      name: componentName,
      props: { [plan.key]: plan.value },
    }
  );

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true, png: result.png };
};

const previewVariant = async (
  preview: PreviewService,
  scope: VariantScope,
  plan: VariantPlan
): Promise<VariantPreview> => {
  const { name } = plan.component;

  if (!name) {
    return { ok: false, reason: "No component in the file uses this cva()." };
  }

  try {
    return await renderPreview(preview, scope, plan, name);
  } catch (error) {
    return { ok: false, reason: reasonOf(error as Error | null) };
  }
};

const noteWith = (plan: VariantPlan, preview: VariantPreview): string => {
  const parts = [plan.note];

  if (preview.ok) {
    parts.push(LAG_NOTE);
  } else {
    parts.push(`No preview: ${preview.reason}`);
  }

  return parts.filter(Boolean).join(" ");
};

const toVariantResult = (
  plan: VariantPlan,
  version: Version | null,
  preview: VariantPreview
): ComponentVariantResult => ({
  component: plan.component,
  cva: plan.cva,
  default: plan.default,
  files: plan.written.map((entry) => entry.target.relative),
  key: plan.key,
  note: noteWith(plan, preview),
  title: plan.title,
  value: plan.value,
  values: plan.values,
  versionId: version?.id ?? null,
});

export { previewVariant, toVariantResult, writeVariant };

export type { VariantDone, VariantPreview };
