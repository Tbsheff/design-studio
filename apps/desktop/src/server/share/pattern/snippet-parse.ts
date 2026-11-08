import { parseExpression } from "@babel/parser";

import type { JSXFragment } from "./engine/deps.js";

const WRAP_HEAD = "<>\n";

const WRAP_TAIL = "\n</>";

const toWrapped = (text: string): string => `${WRAP_HEAD}${text}${WRAP_TAIL}`;

const toFragment = (
  wrapped: string,
  isTypescript: boolean
): JSXFragment | null => {
  const plugins: ("jsx" | "typescript")[] = ["jsx"];

  if (isTypescript) {
    plugins.push("typescript");
  }

  try {
    const node = parseExpression(wrapped, { plugins });

    if (node.type === "JSXFragment") {
      return node;
    }

    return null;
  } catch {
    return null;
  }
};

export { toFragment, toWrapped };
