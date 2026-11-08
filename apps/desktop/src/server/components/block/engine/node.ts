import type { BlockAttrs, BlockChild, BlockNode } from "./types.js";

const NO_ATTRS: BlockAttrs = {};

const toNode = (
  tag: string,
  attrs: BlockAttrs,
  children: readonly BlockChild[]
): BlockNode => ({ attrs, children, tag });

const toBadge = (variant: string, text: string): BlockNode =>
  toNode("Badge", { variant }, [text]);

const toButton = (variant: string | null, text: string): BlockNode => {
  if (variant === null) {
    return toNode("Button", NO_ATTRS, [text]);
  }

  return toNode("Button", { variant }, [text]);
};

const toSmallButton = (variant: string | null, text: string): BlockNode => {
  if (variant === null) {
    return toNode("Button", { size: "sm" }, [text]);
  }

  return toNode("Button", { size: "sm", variant }, [text]);
};

const toText = (className: string, text: string): BlockNode =>
  toNode("p", { className: `m-0 ${className}` }, [text]);

const toField = (
  id: string,
  label: string,
  input: BlockAttrs,
  className: string
): BlockNode =>
  toNode("div", { className: `flex flex-col gap-2 ${className}`.trim() }, [
    toNode("Label", { htmlFor: id }, [label]),
    toNode("Input", { id, ...input }, []),
  ]);

interface CardParts {
  readonly className: string;
  readonly content: readonly BlockChild[];
  readonly contentClass: string;
  readonly description: string;
  readonly footer: readonly BlockChild[] | null;
  readonly title: string;
}

const toCard = (parts: CardParts): BlockNode => {
  const children: BlockChild[] = [
    toNode("CardHeader", NO_ATTRS, [
      toNode("CardTitle", NO_ATTRS, [parts.title]),
      toNode("CardDescription", NO_ATTRS, [parts.description]),
    ]),
    toNode("CardContent", { className: parts.contentClass }, parts.content),
  ];

  if (parts.footer !== null) {
    children.push(
      toNode("CardFooter", { className: "justify-end gap-2" }, parts.footer)
    );
  }

  return toNode("Card", { className: parts.className }, children);
};

export {
  NO_ATTRS,
  toBadge,
  toButton,
  toCard,
  toField,
  toSmallButton,
  toNode,
  toText,
};

export type { CardParts };
