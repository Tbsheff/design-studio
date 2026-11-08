import { NO_ATTRS, toBadge, toCard, toNode, toSmallButton } from "./node.js";
import type { BlockNode, BlockTemplate } from "./types.js";

interface Customer {
  readonly email: string;
  readonly joined: string;
  readonly name: string;
  readonly status: string;
  readonly tone: string;
}

const CUSTOMERS: readonly Customer[] = [
  {
    email: "avery@northwind.co",
    joined: "Jun 12, 2026",
    name: "Avery Chen",
    status: "Active",
    tone: "default",
  },
  {
    email: "jordan@lumen.io",
    joined: "Jun 10, 2026",
    name: "Jordan Blake",
    status: "Pending",
    tone: "secondary",
  },
  {
    email: "priya@harbor.dev",
    joined: "Jun 08, 2026",
    name: "Priya Nair",
    status: "Active",
    tone: "default",
  },
  {
    email: "mateo@kiln.cafe",
    joined: "Jun 03, 2026",
    name: "Mateo Silva",
    status: "Paused",
    tone: "outline",
  },
];

const HEADINGS = ["Name", "Email", "Status", "Joined"] as const;

const toHeadRow = (): BlockNode =>
  toNode(
    "TableRow",
    NO_ATTRS,
    HEADINGS.map((heading) => toNode("TableHead", NO_ATTRS, [heading]))
  );

const toCustomerRow = (customer: Customer): BlockNode =>
  toNode("TableRow", NO_ATTRS, [
    toNode("TableCell", { className: "font-medium" }, [customer.name]),
    toNode("TableCell", NO_ATTRS, [customer.email]),
    toNode("TableCell", NO_ATTRS, [toBadge(customer.tone, customer.status)]),
    toNode("TableCell", NO_ATTRS, [customer.joined]),
  ]);

const toCustomerTable = (): BlockNode =>
  toNode("Table", NO_ATTRS, [
    toNode("TableHeader", NO_ATTRS, [toHeadRow()]),
    toNode(
      "TableBody",
      NO_ATTRS,
      CUSTOMERS.map((customer) => toCustomerRow(customer))
    ),
  ]);

const toFilterBar = (): BlockNode =>
  toNode("div", { className: "flex flex-wrap items-center gap-2 pb-4" }, [
    toNode(
      "Input",
      {
        className: "max-w-xs",
        placeholder: "Search customers",
        type: "search",
      },
      []
    ),
    toSmallButton("outline", "Status"),
    toSmallButton("outline", "Joined"),
    toSmallButton(null, "Add customer"),
  ]);

const toPagingFooter = (): BlockNode =>
  toNode("CardFooter", { className: "justify-between" }, [
    toNode("span", { className: "text-sm text-muted-foreground" }, [
      "Showing 4 of 128",
    ]),
    toNode("div", { className: "flex gap-2" }, [
      toSmallButton("outline", "Previous"),
      toSmallButton("outline", "Next"),
    ]),
  ]);

const toFilteredTable = (): BlockNode => {
  const card = toCard({
    className: "",
    content: [toFilterBar(), toCustomerTable()],
    contentClass: "",
    description: "Filter by status or join date.",
    footer: null,
    title: "All customers",
  });

  return toNode("Card", NO_ATTRS, [...card.children, toPagingFooter()]);
};

const TABLE_TEMPLATES: readonly BlockTemplate[] = [
  {
    description:
      "A card with a title and a table of rows. Each row has a name, an email, a status badge and a date.",
    entity: "customer",
    id: "table-basic",
    kind: "table",
    name: "Data table",
    root: toCard({
      className: "",
      content: [toCustomerTable()],
      contentClass: "",
      description: "Everyone who joined in the last 30 days.",
      footer: null,
      title: "Customers",
    }),
  },
  {
    description:
      "A table card with a search field, filter buttons, an add button and paging controls.",
    entity: "customer",
    id: "table-filtered",
    kind: "table",
    name: "Filtered table",
    root: toFilteredTable(),
  },
];

export { TABLE_TEMPLATES };
