import { applyDirectEdit } from "@design-studio/actions/direct-edit/apply";
import type { SourceLoc, StructureEditResult } from "@design-studio/contracts";

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
  replace?: StructureTarget[];
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

const toReplaceTargets = (
  deps: EditDeps,
  url: string,
  input: EditElementInput
): Promise<StructureTarget[]> => {
  const slots = input.replace ?? [];

  return Promise.all(slots.map((item) => targetAt(deps, url, item.selector)));
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

const toSummary = (
  op: StructureOp,
  targets: readonly StructureTarget[],
  places: {
    readonly into: StructureTarget | null;
    readonly slots: StructureTarget[];
  }
): string => {
  const what = countText(targets, targets[0]?.tag ?? "element");

  if (places.slots.length > 0) {
    return `Replaced ${countText(places.slots, places.slots[0]?.tag ?? "element")} with ${what}`;
  }

  return `${OP_WORDS[op]} ${what}${intoText(places.into)}`;
};

const structureBody = (
  op: StructureOp,
  targets: StructureTarget[],
  places: {
    readonly into: StructureTarget | null;
    readonly slots: StructureTarget[];
  }
): StructureBody => {
  const body: StructureBody = { op, targets };

  if (places.into) {
    body.into = places.into;
  }

  if (places.slots.length > 0) {
    body.replace = places.slots;
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

  const slots = await toReplaceTargets(deps, url, input);

  const places = { into, slots };

  const result = await callAction<StructureEditResult>(deps, applyDirectEdit, {
    ...structureBody(op, targets, places),
    directionId: direction.id,
    projectId: project.id,
  });

  const summary = toSummary(op, targets, places);

  return {
    activity: versionActivity(project, direction, summary, result.version),
    result: ok(structureResult(result)),
  };
};

export { structureElement };
