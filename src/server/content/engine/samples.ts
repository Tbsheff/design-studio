type Preset = "commerce" | "finance" | "generic" | "healthcare" | "social";

type Kind =
  | "amount"
  | "date"
  | "email"
  | "initials"
  | "name"
  | "sentence"
  | "status"
  | "title";

interface PresetData {
  readonly columns: readonly Kind[];
  readonly currency: string;
  readonly names: readonly string[];
  readonly sentences: readonly string[];
  readonly statuses: readonly string[];
  readonly titles: readonly string[];
}

const PEOPLE: readonly string[] = [
  "Maya Okafor",
  "Daniel Reyes",
  "Priya Nair",
  "Tomas Lindqvist",
  "Aisha Rahman",
  "Jonas Becker",
  "Lucia Fernandez",
  "Kenji Watanabe",
  "Hannah Cole",
  "Samuel Adeyemi",
  "Chloe Martin",
  "Ravi Patel",
];

const PRESETS: Readonly<Record<Preset, PresetData>> = {
  commerce: {
    columns: ["title", "status", "amount", "date"],
    currency: "$",
    names: PEOPLE,
    sentences: [
      "Free shipping on orders over $50.",
      "Ships in 2 to 3 business days.",
      "Made from recycled cotton.",
    ],
    statuses: ["Processing", "Shipped", "Delivered", "Returned", "Backordered"],
    titles: [
      "Linen overshirt",
      "Trail running shoes",
      "Ceramic pour-over set",
      "Canvas weekender bag",
      "Wool beanie",
    ],
  },
  finance: {
    columns: ["name", "title", "amount", "status", "date"],
    currency: "$",
    names: [
      "Northwind Traders",
      "Contoso Payroll",
      "Fabrikam Supply",
      "Alder & Finch LLP",
      "Harbor Utilities",
      "Summit Insurance",
    ],
    sentences: [
      "Funds settle within 1 business day.",
      "Statement ready for March.",
      "Transfer limit resets monthly.",
    ],
    statuses: ["Posted", "Pending", "Settled", "Declined", "Scheduled"],
    titles: [
      "Wire transfer",
      "Monthly invoice",
      "Card payment",
      "Direct deposit",
      "Account fee",
    ],
  },
  generic: {
    columns: ["name", "title", "status", "date", "amount"],
    currency: "$",
    names: PEOPLE,
    sentences: [
      "Updated by the design team this week.",
      "Review the notes before the next sync.",
      "Shared with everyone in the workspace.",
    ],
    statuses: ["Active", "Pending", "Draft", "Archived", "In review"],
    titles: [
      "Quarterly report",
      "Design review",
      "Launch checklist",
      "Customer interviews",
      "Roadmap update",
    ],
  },
  healthcare: {
    columns: ["name", "title", "status", "date", "amount"],
    currency: "$",
    names: PEOPLE,
    sentences: [
      "Patient reports mild improvement.",
      "Follow-up visit in 6 weeks.",
      "Lab results are available.",
    ],
    statuses: [
      "Scheduled",
      "Checked in",
      "In progress",
      "Completed",
      "No show",
    ],
    titles: [
      "Annual physical",
      "Blood pressure check",
      "Lab panel review",
      "Physical therapy",
      "Medication refill",
    ],
  },
  social: {
    columns: ["name", "sentence", "date", "amount", "status"],
    currency: "",
    names: [
      "maya.okafor",
      "danreyes",
      "priya_n",
      "tomas.l",
      "aisha.codes",
      "jonasb",
    ],
    sentences: [
      "Just shipped the new onboarding flow.",
      "Coffee, then code review.",
      "Anyone else watching the launch today?",
    ],
    statuses: ["Online", "Away", "Busy", "Offline"],
    titles: [
      "Weekend build log",
      "Small wins thread",
      "Design critique night",
      "Ask me anything",
    ],
  },
};

const MONTHS: readonly string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LONG_TEXTS: readonly string[] = [
  "Bartholomew Montgomery-Featherstonehaugh the Third of Westminster",
  "An exceptionally long line of content that keeps going well past the width of its container to test wrapping",
  "Supercalifragilisticexpialidocious_unbroken_identifier_without_any_spaces_0123456789",
];

const SHORT_TEXTS: readonly string[] = ["A", "No", "7", "Ok", "-"];

const ACCENT_FROM = "ACEINOSUYaceinosuy";

const ACCENT_TO =
  "\u00C5\u00C7\u00CB\u00CF\u00D1\u00D6\u0160\u00DB\u00DD\u00E0\u00E7\u00E9\u00EF\u00F1\u00F5\u0161\u00FC\u00FD";

export { ACCENT_FROM, ACCENT_TO, LONG_TEXTS, MONTHS, PRESETS, SHORT_TEXTS };

export type { Kind, Preset, PresetData };
