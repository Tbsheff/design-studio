import { randomBytes } from "node:crypto";

import type {
  ClassDelta,
  DirectEditRequest,
  DomPatch,
  StudioEventInput,
  TailwindOutcome,
} from "@design-studio/actions/_core/contracts";
import { logError } from "../platform/logger/index.js";

interface AppliedPatch {
  applied: { text: boolean };
  tailwind?: TailwindOutcome | undefined;
}

type PlannedEdit =
  | {
      kind: "planned";
      projectId: string;
      directionId: string;
      id: string;
      patches: DomPatch[];
    }
  | { kind: "unplanned"; projectId: string; directionId: string; id: string };

type Listener = (edit: PlannedEdit) => void;

const ID_BYTES = 6;

const listeners = new Set<Listener>();

const onPlannedEdit = (listener: Listener): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const emit = (edit: PlannedEdit): void => {
  for (const listener of listeners) {
    try {
      listener(edit);
    } catch (error) {
      logError("[planned-edit] listener failed", error);
    }
  }
};

const isSet = <Value>(value?: Value | null): boolean =>
  (value ?? null) !== null;

const textOf = (
  request: DirectEditRequest,
  patch: AppliedPatch
): string | null => {
  if (patch.applied.text && isSet(request.text)) {
    return request.text ?? null;
  }

  return null;
};

const hasChange = (dom: DomPatch): boolean =>
  isSet(dom.style) || isSet(dom.classes) || isSet(dom.text);

const styleOf = (
  request: DirectEditRequest
): Record<string, string | null> | null => {
  if (request.style && Object.keys(request.style).length > 0) {
    return request.style as Record<string, string | null>;
  }

  return null;
};

const classesOf = (patch: AppliedPatch): ClassDelta | null => {
  if (patch.tailwind?.mode !== "classes") {
    return null;
  }

  const { delta } = patch.tailwind;

  if (delta && delta.add.length + delta.remove.length > 0) {
    return delta;
  }

  return null;
};

const domPatchOf = (
  request: DirectEditRequest,
  patch: AppliedPatch
): DomPatch | null => {
  if (request.variant || isSet(request.move) || isSet(request.insert)) {
    return null;
  }

  const style = styleOf(request);
  const classes = classesOf(patch);
  const text = textOf(request, patch);

  const dom: DomPatch = {
    loc: `${request.source.file}:${request.source.line}:${request.source.col}`,
    selector: request.selector,
  };

  if (request.tag) {
    dom.tag = request.tag;
  }

  if (style) {
    dom.style = style;
  }

  if (classes) {
    dom.classes = classes;
  }

  if (text !== null) {
    dom.text = text;
  }

  if (hasChange(dom)) {
    return dom;
  }

  return null;
};

const announcePlanned = (
  projectId: string,
  directionId: string,
  patches: (DomPatch | null)[]
): string | null => {
  const kept = patches.filter((patch): patch is DomPatch => patch !== null);

  if (kept.length === 0) {
    return null;
  }

  const id = randomBytes(ID_BYTES).toString("hex");

  const ids = { directionId, id, projectId };

  emit({ ...ids, kind: "planned", patches: kept });

  return id;
};

const withdrawPlanned = (
  projectId: string,
  directionId: string,
  id: string | null
): void => {
  if (id) {
    const ids = { directionId, id, projectId };

    emit({ ...ids, kind: "unplanned" });
  }
};

const toEditEvent = (edit: PlannedEdit): StudioEventInput => {
  if (edit.kind === "planned") {
    const { directionId, id, patches, projectId } = edit;

    return { directionId, id, patches, projectId, type: "edit.planned" };
  }

  const { directionId, id, projectId } = edit;

  return { directionId, id, projectId, type: "edit.unplanned" };
};

export {
  announcePlanned,
  domPatchOf,
  onPlannedEdit,
  toEditEvent,
  withdrawPlanned,
};

export type { PlannedEdit };
