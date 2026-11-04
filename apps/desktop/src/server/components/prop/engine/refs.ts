import type { Node as BabelNode } from "@babel/types";

import { isTypeNode, toStart, toEnd, runWalk } from "./ast.js";
import type { ComponentModel, Splice } from "./types.js";

interface Reference {
  readonly end: number;
  readonly isShorthand: boolean;
  readonly start: number;
}

const isPlainKey = (node: BabelNode, parent: BabelNode | null): boolean => {
  if (
    parent?.type === "MemberExpression" ||
    parent?.type === "OptionalMemberExpression"
  ) {
    return parent.property === node && !parent.computed;
  }

  return false;
};

const isObjectKey = (node: BabelNode, parent: BabelNode | null): boolean =>
  parent?.type === "ObjectProperty" && parent.key === node && !parent.computed;

const toReferences = (
  roots: readonly BabelNode[],
  local: string
): Reference[] => {
  const out: Reference[] = [];

  for (const root of roots) {
    runWalk(root, null, (node, parent) => {
      if (isTypeNode(node)) {
        return false;
      }

      if (node.type !== "Identifier" || node.name !== local) {
        return true;
      }

      if (isPlainKey(node, parent)) {
        return true;
      }

      if (parent?.type === "ObjectProperty" && parent.shorthand) {
        if (parent.value === node) {
          out.push({
            end: toEnd(node),
            isShorthand: true,
            start: toStart(node),
          });
        }

        return true;
      }

      if (!isObjectKey(node, parent)) {
        out.push({
          end: toEnd(node),
          isShorthand: false,
          start: toStart(node),
        });
      }

      return true;
    });
  }

  return out;
};

const toBodyRoots = (model: ComponentModel, local: string): BabelNode[] => {
  const siblings = model.entries.flatMap((entry) => {
    if (entry.local === local || !entry.defaultNode) {
      return [];
    }

    return [entry.defaultNode];
  });

  return [model.fn.body, ...siblings];
};

const toReferenceSplices = (
  references: readonly Reference[],
  from: string,
  to: string
): Splice[] =>
  references.map((reference) => {
    if (reference.isShorthand) {
      return {
        end: reference.end,
        start: reference.start,
        text: `${from}: ${to}`,
      };
    }

    return { end: reference.end, start: reference.start, text: to };
  });

export { toBodyRoots, toReferenceSplices, toReferences };

export type { Reference };
