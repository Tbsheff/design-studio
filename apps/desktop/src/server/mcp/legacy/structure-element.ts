import { applyDirectEdit } from "../../../shared/actions/direct-edit/apply.js";
import type {
  SourceLoc,
  StructureEditResult,
} from "../../../shared/actions/_core/contracts.js";
import { callAction } from "../action-call.js";
import { loadTarget, refuseWhileRunning } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { ok, pageUrl, sourceElement, versionActivity } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { structureResult } from "./direct-edit-result.js";
import type { EditElementInput } from "./direct-edit-schema.js";

type StructureOp = NonNullable<EditElementInput["op"]>;

interface StructureTarget {
  selector: string;
  source: SourceLoc;
  tag: string;
}

interface StructureBody {
  into?: StructureTarget;
  op: StructureOp;
  targets: StructureTarget[];
}

const OP_WORDS = {
  clear: "Cleared text in",
  delete: "Deleted",
  duplicate: "Duplicated",
  group: "Grouped",
  move: "Moved",
  unwrap: "Unwrapped",
  wrap: "Wrapped",
} as const;

const targetAt = async (
  deps: EditDeps,
  url: string,
  sel: string
): Promise<StructureTarget> => {
  const found = await sourceElement(deps, url, sel);

  return { selector: sel, source: found.source, tag: found.tag };
};

const intoTarget = (
  deps: EditDeps,
  url: string,
  input: EditElementInput
): Promise<StructureTarget | null> => {
  if (!input.targetSelector) {
    return Promise.resolve(null);
  }

  return targetAt(deps, url, input.targetSelector);
};

const moreTargets = (
  deps: EditDeps,
  url: string,
  input: EditElementInput
): Promise<StructureTarget[]> => {
  const also = input.also ?? [];

  return Promise.all(also.map((item) => targetAt(deps, url, item.selector)));
};

const countText = (
  targets: readonly StructureTarget[],
  tag: string
): string => {
  if (targets.length > 1) {
    return `${targets.length} elements`;
  }

  return tag;
};

const intoText = (into: StructureTarget | null): string => {
  if (into) {
    return ` into ${into.tag}`;
  }

  return "";
};

const structureBody = (
  op: StructureOp,
  targets: StructureTarget[],
  into: StructureTarget | null
): StructureBody => {
  const body: StructureBody = { op, targets };

  if (into) {
    body.into = into;
  }

  return body;
};

const structureElement = async (
  deps: EditDeps,
  input: EditElementInput,
  op: StructureOp
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  refuseWhileRunning(deps, project, direction);

  const url = await pageUrl(deps, project, direction, input.path);

  const element = await targetAt(deps, url, input.selector);

  const intoLookup = intoTarget(deps, url, input);

  const into = await intoLookup;

  const moreLookup = moreTargets(deps, url, input);

  const more = await moreLookup;

  const targets = [element, ...more];

  const result = await callAction<StructureEditResult>(deps, applyDirectEdit, {
    ...structureBody(op, targets, into),
    directionId: direction.id,
    projectId: project.id,
  });

  const summary = `${OP_WORDS[op]} ${countText(targets, element.tag)}${intoText(into)}`;

  return {
    activity: versionActivity(project, direction, summary, result.version),
    result: ok(structureResult(result)),
  };
};

export { structureElement };
