type FixKind = "clipped-text" | "horizontal-scroll" | "overflow" | "tap-target";

interface FixFacts {
  readonly blockParentLoc: string | null;
  readonly display: string;
  readonly overflowX: string;
  readonly parentDisplay: string;
  readonly tag: string;
}

interface FixIntent {
  readonly classes: readonly string[];
  readonly declarations: readonly string[];
  readonly isParent: boolean;
}

interface FixBreakpoint {
  readonly name: string;
  readonly px: number;
}

type FixDecision =
  | { readonly intent: FixIntent; readonly isFixable: true }
  | { readonly isFixable: false; readonly reason: string };

const MEDIA_TAGS: ReadonlySet<string> = new Set([
  "canvas",
  "embed",
  "iframe",
  "img",
  "object",
  "picture",
  "svg",
  "video",
]);

const RATIO_TAGS: ReadonlySet<string> = new Set(["img", "video"]);

const SCROLL_TAGS: ReadonlySet<string> = new Set(["pre", "table"]);

const GRID_DISPLAYS: ReadonlySet<string> = new Set([
  "flex",
  "grid",
  "inline-flex",
  "inline-grid",
]);

const CLIP_CLASSES: ReadonlySet<string> = new Set([
  "truncate",
  "text-ellipsis",
]);

const SCROLL_OVERFLOWS: ReadonlySet<string> = new Set(["auto", "scroll"]);

const MOBILE_BREAKPOINT_PX = 768;

const MAX_WIDTH_CLASS = "max-w-full";

const MAX_WIDTH_RULE = "max-width:100%";

const isScrollTag = (tag: string): boolean => SCROLL_TAGS.has(tag);

const toScrollIntent = (): FixIntent => ({
  classes: [MAX_WIDTH_CLASS, "overflow-x-auto"],
  declarations: [MAX_WIDTH_RULE, "overflow-x:auto"],
  isParent: true,
});

const toMediaIntent = (tag: string): FixIntent => {
  if (RATIO_TAGS.has(tag)) {
    return {
      classes: [MAX_WIDTH_CLASS, "h-auto"],
      declarations: [MAX_WIDTH_RULE, "height:auto"],
      isParent: false,
    };
  }

  return {
    classes: [MAX_WIDTH_CLASS],
    declarations: [MAX_WIDTH_RULE],
    isParent: false,
  };
};

const toOverflowIntent = (facts: FixFacts): FixIntent => {
  if (isScrollTag(facts.tag)) {
    return toScrollIntent();
  }

  if (MEDIA_TAGS.has(facts.tag)) {
    return toMediaIntent(facts.tag);
  }

  if (GRID_DISPLAYS.has(facts.parentDisplay)) {
    return {
      classes: ["min-w-0", MAX_WIDTH_CLASS],
      declarations: ["min-width:0", MAX_WIDTH_RULE],
      isParent: false,
    };
  }

  return {
    classes: [MAX_WIDTH_CLASS],
    declarations: [MAX_WIDTH_RULE],
    isParent: false,
  };
};

const toClippedIntent = (existing: readonly string[]): FixIntent => {
  const isClamped = existing.some((token) => CLIP_CLASSES.has(token));

  const classes = ["whitespace-normal", "break-words", "min-w-0"];

  const declarations = [
    "white-space:normal",
    "overflow-wrap:anywhere",
    "min-width:0",
  ];

  if (isClamped) {
    return {
      classes: [...classes, "overflow-visible", "text-clip"],
      declarations: [...declarations, "overflow:visible", "text-overflow:clip"],
      isParent: false,
    };
  }

  return { classes, declarations, isParent: false };
};

const toTapIntent = (facts: FixFacts): FixIntent => {
  if (facts.display === "inline") {
    return {
      classes: [
        "inline-flex",
        "items-center",
        "justify-center",
        "min-h-11",
        "min-w-11",
      ],
      declarations: [
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "min-height:44px",
        "min-width:44px",
      ],
      isParent: false,
    };
  }

  return {
    classes: ["min-h-11", "min-w-11"],
    declarations: ["min-height:44px", "min-width:44px"],
    isParent: false,
  };
};

const toFixDecision = (
  kind: FixKind,
  facts: FixFacts,
  existing: readonly string[]
): FixDecision => {
  if (kind === "overflow") {
    if (SCROLL_OVERFLOWS.has(facts.overflowX)) {
      return {
        isFixable: false,
        reason: "The element already scrolls sideways inside its own box.",
      };
    }

    return { intent: toOverflowIntent(facts), isFixable: true };
  }

  if (kind === "clipped-text") {
    return { intent: toClippedIntent(existing), isFixable: true };
  }

  if (kind === "tap-target") {
    return { intent: toTapIntent(facts), isFixable: true };
  }

  if (isScrollTag(facts.tag)) {
    return { intent: toScrollIntent(), isFixable: true };
  }

  return {
    isFixable: false,
    reason: "Only a table or pre can be wrapped in a scroll box.",
  };
};

const toBreakpointPrefix = (
  width: number,
  breakpoints: readonly FixBreakpoint[]
): string => {
  const ordered = breakpoints.toSorted((left, right) => left.px - right.px);

  const next = ordered.find(
    (breakpoint) =>
      breakpoint.px > width && breakpoint.px >= MOBILE_BREAKPOINT_PX
  );

  if (next) {
    return `max-${next.name}`;
  }

  return `max-[${width}px]`;
};

const toScopedClasses = (
  prefix: string,
  classes: readonly string[]
): readonly string[] => classes.map((token) => `${prefix}:${token}`);

const toMediaLine = (
  marker: string,
  width: number,
  declarations: readonly string[]
): string =>
  `@media (max-width:${width}px){.${marker}.${marker}{${declarations.join(";")}}}`;

export {
  isScrollTag,
  toBreakpointPrefix,
  toFixDecision,
  toMediaLine,
  toScopedClasses,
};

export type { FixBreakpoint, FixDecision, FixFacts, FixIntent, FixKind };
