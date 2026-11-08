import { NO_ATTRS, toBadge, toButton, toNode, toText } from "./node.js";
import type { BlockNode, BlockTemplate } from "./types.js";

const ROW = "flex items-center gap-2";

const MUTED = "text-sm text-muted-foreground";

const MUTED_PAD = `pt-4 ${MUTED}`;

const PANELS = [
  [
    "overview",
    "Overview",
    "Shipping, billing and payment details appear here.",
  ],
  ["items", "Items", "Line items for this order appear here."],
  ["activity", "Activity", "Status changes and notes appear here."],
] as const;

type Panel = (typeof PANELS)[number];

const toTrigger = (panel: Panel): BlockNode =>
  toNode("TabsTrigger", { value: panel[0] }, [panel[1]]);

const toPanel = (panel: Panel): BlockNode =>
  toNode("TabsContent", { value: panel[0] }, [toText(MUTED_PAD, panel[2])]);

const toTitleBlock = (): BlockNode =>
  toNode("div", { className: "flex flex-col gap-1" }, [
    toNode("div", { className: ROW }, [
      toNode("h1", { className: "text-2xl font-semibold" }, ["Order 10482"]),
      toBadge("secondary", "Processing"),
    ]),
    toText(MUTED, "Placed by Avery Chen on Jun 12, 2026"),
  ]);

const toActions = (): BlockNode =>
  toNode("div", { className: ROW }, [
    toButton("outline", "Print invoice"),
    toButton(null, "Mark as shipped"),
  ]);

const toTabs = (): BlockNode => {
  const triggers = PANELS.map((panel) => toTrigger(panel));
  const panels = PANELS.map((panel) => toPanel(panel));

  return toNode("Tabs", { defaultValue: "overview" }, [
    toNode("TabsList", NO_ATTRS, triggers),
    ...panels,
  ]);
};

const toDetailHeader = (): BlockNode => {
  const top = toNode(
    "div",
    { className: "flex flex-wrap items-start justify-between gap-4" },
    [toTitleBlock(), toActions()]
  );

  return toNode("div", { className: "flex flex-col gap-4" }, [top, toTabs()]);
};

const toPageHeader = (): BlockNode =>
  toNode(
    "div",
    { className: "flex flex-wrap items-start justify-between gap-4 pb-2" },
    [
      toNode("div", { className: "flex flex-col gap-1" }, [
        toNode("h1", { className: "text-2xl font-semibold" }, ["Customers"]),
        toText(MUTED, "Manage who can order, and review their activity."),
      ]),
      toNode("div", { className: ROW }, [
        toButton("outline", "Export"),
        toButton(null, "Add customer"),
      ]),
    ]
  );

const HEADER_TEMPLATES: readonly BlockTemplate[] = [
  {
    description:
      "A record title with a status badge, two actions and a tab bar with three panels.",
    entity: "order",
    id: "detail-header",
    kind: "detail-header",
    name: "Detail header with tabs",
    root: toDetailHeader(),
  },
  {
    description:
      "A page title with a short description and two action buttons.",
    entity: null,
    id: "page-header",
    kind: "page-header",
    name: "Page header",
    root: toPageHeader(),
  },
];

export { HEADER_TEMPLATES };
