type BlockKind =
  | "auth"
  | "detail-header"
  | "empty-state"
  | "form"
  | "list-detail"
  | "page-header"
  | "stats"
  | "table";

type BlockAttrs = Readonly<Record<string, string>>;

type BlockChild = BlockNode | string;

interface BlockNode {
  readonly attrs: BlockAttrs;
  readonly children: readonly BlockChild[];
  readonly tag: string;
}

interface BlockTemplate {
  readonly description: string;
  readonly entity: string | null;
  readonly id: string;
  readonly kind: BlockKind;
  readonly name: string;
  readonly root: BlockNode;
}

interface BlockRender {
  readonly fallbacks: readonly string[];
  readonly markup: string;
}

interface BlockRenderOptions {
  readonly available: ReadonlySet<string>;
  readonly isHtml: boolean;
}

interface SlotFallback {
  readonly attrs: BlockAttrs;
  readonly className: string;
  readonly drop: readonly string[];
  readonly tag: string;
}

export type {
  BlockAttrs,
  BlockChild,
  BlockKind,
  BlockNode,
  BlockRender,
  BlockRenderOptions,
  BlockTemplate,
  SlotFallback,
};
