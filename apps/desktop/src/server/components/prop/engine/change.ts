import type { Node as BabelNode } from "@babel/types";

import { toEnd, toStart } from "./ast.js";
import { toBodyBindings } from "./component.js";
import { toKind } from "./list.js";
import type { PropKind } from "./list.js";
import { toBodyRoots, toReferenceSplices, toReferences } from "./refs.js";
import { toRemoveItem } from "./splice.js";
import { toPlanned, toRefusal } from "./types.js";
import type {
  ComponentModel,
  Member,
  Outcome,
  PropEntry,
  Splice,
  TypeBody,
} from "./types.js";

interface ChangePlan {
  readonly default: string | null;
  readonly kind: PropKind;
  readonly splices: readonly Splice[];
}

interface Located {
  readonly entry: PropEntry;
  readonly local: string;
  readonly member: Member | null;
}

const RESERVED = new Set([
  "children",
  "className",
  "dangerouslySetInnerHTML",
  "key",
  "ref",
  "style",
]);

const SIMPLE_DEFAULT =
  /^(?:["'`][^\n]*["'`]|-?\d[\d._]*|true|false|null|[A-Za-z_$][\w$.]*|<[^\n]*>)$/u;

const toLocated = (model: ComponentModel, name: string): Outcome<Located> => {
  const entry = model.entries.find((item) => item.name === name);
  const member = model.host.members.find((item) => item.name === name) ?? null;

  if (name === "children") {
    return toRefusal("bad_request", "children cannot be renamed or deleted.");
  }

  if (!entry) {
    return toRefusal(
      "not_found",
      `${model.name} does not destructure a prop named ${name}.`
    );
  }

  const { local } = entry;

  if (local === null) {
    return toRefusal(
      "bad_request",
      `${name} is destructured in a nested pattern.`
    );
  }

  if (model.isTyped && member === null) {
    return toRefusal(
      "bad_request",
      `${name} is typed outside this file, so its type cannot be edited. Only props declared in the component can change.`
    );
  }

  if (toBodyBindings(model, null).has(local)) {
    return toRefusal(
      "bad_request",
      `${local} is declared again inside ${model.name}, so its uses cannot be followed.`
    );
  }

  return toPlanned({ entry, local, member });
};

const toConflict = (model: ComponentModel, newName: string): Outcome<null> => {
  const known =
    model.entries.some(
      (entry) => entry.name === newName || entry.local === newName
    ) ||
    model.host.members.some((member) => member.name === newName) ||
    toBodyBindings(model, null).has(newName);

  if (RESERVED.has(newName)) {
    return toRefusal("bad_request", `"${newName}" cannot be a prop name.`);
  }

  if (known) {
    return toRefusal(
      "conflict",
      `${model.name} has the prop or the variable ${newName} already.`
    );
  }

  return toPlanned(null);
};

const toDefaultText = (
  model: ComponentModel,
  entry: PropEntry
): string | null => {
  if (!entry.defaultNode) {
    return null;
  }

  return model.code.slice(toStart(entry.defaultNode), toEnd(entry.defaultNode));
};

const toKindOf = (located: Located, defaultText: string | null): PropKind =>
  toKind(located.entry.name, located.member?.typeText ?? null, defaultText);

interface Span {
  readonly end: number;
  readonly start: number;
}

const toSpan = (node: BabelNode): Span => ({
  end: toEnd(node),
  start: toStart(node),
});

const toRenameSplices = (
  model: ComponentModel,
  located: Located,
  newName: string
): Splice[] => {
  const { entry, local, member } = located;
  const { key } = entry.property;
  const splices: Splice[] = [{ ...toSpan(key), text: newName }];

  if (entry.isShorthand) {
    const references = toReferences(toBodyRoots(model, local), local);

    splices.push(...toReferenceSplices(references, local, newName));
  }

  if (member) {
    splices.push({ ...toSpan(member.node.key), text: newName });
  }

  return splices;
};

const createRenamePlan = (
  model: ComponentModel,
  name: string,
  newName: string
): Outcome<ChangePlan> => {
  const located = toLocated(model, name);

  if (!located.ok) {
    return located;
  }

  const conflict = toConflict(model, newName);

  if (!conflict.ok) {
    return conflict;
  }

  const defaultText = toDefaultText(model, located.value.entry);
  const kind = toKindOf(located.value, defaultText);
  const splices = toRenameSplices(model, located.value, newName);

  return toPlanned({ default: defaultText, kind, splices });
};

const toInline = (text: string): string => {
  if (SIMPLE_DEFAULT.test(text)) {
    return text;
  }

  return `(${text})`;
};

const toBodyList = (host: TypeBody): readonly BabelNode[] => {
  if (host.type === "TSTypeLiteral") {
    return host.members;
  }

  return host.body;
};

const toCuts = (model: ComponentModel, located: Located): Splice[] => {
  const { entry, member } = located;
  const items = model.pattern.properties;
  const cuts: Splice[] = [];

  const entryCut = toRemoveItem(
    items.map((item) => toSpan(item)),
    items.indexOf(entry.property)
  );

  if (entryCut) {
    cuts.push(entryCut);
  }

  if (member) {
    const list = toBodyList(member.host);

    const memberCut = toRemoveItem(
      list.map((item) => toSpan(item)),
      list.indexOf(member.node)
    );

    if (memberCut) {
      cuts.push(memberCut);
    }
  }

  return cuts;
};

const createDeletePlan = (
  model: ComponentModel,
  name: string
): Outcome<ChangePlan> => {
  const located = toLocated(model, name);

  if (!located.ok) {
    return located;
  }

  const { entry, local } = located.value;
  const defaultText = toDefaultText(model, entry);
  const references = toReferences(toBodyRoots(model, local), local);

  if (references.length > 0 && defaultText === null) {
    return toRefusal(
      "bad_request",
      `${name} is read in ${model.name} and has no default, so it cannot be removed without changing the render.`
    );
  }

  const inline = toInline(defaultText ?? "undefined");
  const kind = toKindOf(located.value, defaultText);

  const splices = [
    ...toReferenceSplices(references, local, inline),
    ...toCuts(model, located.value),
  ];

  return toPlanned({ default: defaultText, kind, splices });
};

export { createDeletePlan, createRenamePlan };

export type { ChangePlan };
