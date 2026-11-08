import { NO_ATTRS, toBadge, toNode } from "./node.js";
import type { BlockNode, BlockTemplate } from "./types.js";

interface Stat {
  readonly badge: BlockNode;
  readonly label: string;
  readonly value: string;
}

const STATS: readonly Stat[] = [
  {
    badge: toBadge("secondary", "+12.5% from last month"),
    label: "Total revenue",
    value: "$48,230",
  },
  {
    badge: toBadge("secondary", "+4.1% from last month"),
    label: "Active customers",
    value: "1,284",
  },
  {
    badge: toBadge("outline", "12 need review"),
    label: "Open orders",
    value: "96",
  },
  {
    badge: toBadge("outline", "-0.3% from last month"),
    label: "Refund rate",
    value: "1.8%",
  },
];

const toStatCard = (stat: Stat): BlockNode =>
  toNode("Card", NO_ATTRS, [
    toNode("CardHeader", NO_ATTRS, [
      toNode("CardDescription", NO_ATTRS, [stat.label]),
      toNode("CardTitle", { className: "text-2xl" }, [stat.value]),
    ]),
    toNode("CardContent", NO_ATTRS, [stat.badge]),
  ]);

const STATS_TEMPLATES: readonly BlockTemplate[] = [
  {
    description:
      "A row of four stat cards. Each card has a label, a large value and a trend badge.",
    entity: null,
    id: "stats-row",
    kind: "stats",
    name: "Stats row",
    root: toNode(
      "div",
      { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4" },
      STATS.map((stat) => toStatCard(stat))
    ),
  },
];

export { STATS_TEMPLATES };
