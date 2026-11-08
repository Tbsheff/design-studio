import type { DirectStyleProperty } from "@design-studio/contracts";

import type { Field, Part, ShadowView } from "./effects-model.js";
import { fieldPart } from "./effects-model.js";
import type { NumberSpec } from "./number-field-model.js";
import { toShadowsText } from "./shadows-model.js";
import type { Shadow } from "./shadows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { createProxyEdit } from "./use-proxy-edit.js";
import type { CreateRequest, TokenUi } from "./use-token-snap.js";

interface ShadowPatch {
  readonly "box-shadow": string;
}

interface ShadowFieldSpec {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
  readonly index: number;
}

const toShadowPatch = (
  list: Shadow[],
  index: number,
  patch: Partial<Shadow>
): ShadowPatch => {
  const next = [...list];
  const current = list[index];

  if (current) {
    next[index] = { ...current, ...patch };
  }

  return { "box-shadow": toShadowsText(next) };
};

const toFieldProperty = (field: Field): DirectStyleProperty => {
  if (field === "color") {
    return "color";
  }

  return "width";
};

const toFieldEdit = (
  spec: ShadowFieldSpec,
  field: Field,
  value: string,
  write: (next: string) => Partial<Shadow>
): DirectEdit =>
  createProxyEdit(spec.edit, toFieldProperty(field), value, {
    isMixed: spec.view.mixed?.has(`${spec.index}.${field}`) ?? false,
    part: fieldPart(spec.index, field),
    real: ["box-shadow"],
    write: (next) => toShadowPatch(spec.view.list, spec.index, write(next)),
  });

const toPartSpec = (
  field: ShadowFieldSpec,
  meta: {
    readonly part: Part;
    readonly label: string;
    readonly min: number | null;
  },
  value: string,
  count: number
): NumberSpec => {
  const edit = toFieldEdit(field, meta.part, value, (next) => ({
    [meta.part]: next || "0",
  }));

  const label = `Shadow ${count} ${meta.label.toLowerCase()}`;

  if (meta.min === null) {
    return { edit, label, prop: "width" };
  }

  return { edit, label, min: meta.min, prop: "width" };
};

const toInsetTip = (isInset: boolean): string => {
  if (isInset) {
    return "Inner shadow";
  }

  return "Drop shadow";
};

const toInsetToggled = (list: Shadow[], index: number): Shadow[] => {
  const next = [...list];
  const current = list[index];

  if (current) {
    next[index] = { ...current, isInset: !current.isInset };
  }

  return next;
};

const toShadowRemoved = (list: Shadow[], index: number): Shadow[] =>
  list.filter((_entry, position) => position !== index);

const toColorUi = (ui: TokenUi | null): TokenUi | null => {
  if (!ui) {
    return null;
  }

  const request = ui.requestCreate;

  if (!request) {
    return { ...ui, requestCreate: null };
  }

  return {
    ...ui,
    requestCreate: (req: CreateRequest): void =>
      request({ ...req, targets: [] }),
  };
};

export {
  toColorUi,
  toFieldEdit,
  toInsetTip,
  toInsetToggled,
  toPartSpec,
  toShadowRemoved,
};

export type { ShadowFieldSpec };
