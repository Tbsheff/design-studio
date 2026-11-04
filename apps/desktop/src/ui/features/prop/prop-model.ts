import { copy } from "./copy.js";
import type { RouteInput, RouteOutput, propRoutes } from "./deps.js";

type PropRowView = RouteOutput<typeof propRoutes.listProp>["items"][number];

type MakeKind = RouteInput<typeof propRoutes.createProp>["kind"];

type PropKindView = PropRowView["kind"];

interface PropTarget {
  readonly component: string;
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

interface PropLayer {
  readonly col: number;
  readonly line: number;
  readonly tag: string;
}

interface KindOption {
  readonly id: MakeKind;
  readonly label: string;
}

const KINDS: readonly KindOption[] = [
  { id: "text", label: copy.kindText },
  { id: "boolean", label: copy.kindBoolean },
  { id: "slot", label: copy.kindSlot },
  { id: "instance", label: copy.kindInstance },
];

const KIND_LABELS: Readonly<Record<PropKindView, string>> = {
  boolean: copy.kindBoolean,
  instance: copy.kindInstance,
  slot: copy.kindSlot,
  text: copy.kindText,
  value: copy.kindValue,
};

const NAME_PATTERN = /^[A-Za-z_$][\w$]{0,63}$/u;

const isPropName = (name: string): boolean => NAME_PATTERN.test(name);

const toCapital = (text: string): string =>
  `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;

const toSuggestedName = (kind: MakeKind, tag: string): string => {
  const base = tag.replaceAll(/[^A-Za-z0-9]/gu, "");

  if (kind === "boolean") {
    return `show${toCapital(base || "layer")}`;
  }

  if (kind === "text") {
    return "label";
  }

  if (kind === "slot") {
    return "content";
  }

  return base.slice(0, 1).toLowerCase() + base.slice(1) || "component";
};

export { isPropName, KIND_LABELS, KINDS, toSuggestedName };

export type {
  KindOption,
  MakeKind,
  PropKindView,
  PropLayer,
  PropRowView,
  PropTarget,
};
