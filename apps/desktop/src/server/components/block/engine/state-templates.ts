import {
  NO_ATTRS,
  toBadge,
  toButton,
  toCard,
  toField,
  toNode,
  toText,
} from "./node.js";
import type { BlockNode, BlockTemplate } from "./types.js";

const toEmptyState = (): BlockNode =>
  toNode(
    "div",
    {
      className:
        "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center",
    },
    [
      toNode("h2", { className: "text-lg font-semibold" }, [
        "No customers yet",
      ]),
      toText(
        "max-w-sm text-sm text-muted-foreground",
        "Add your first customer to start tracking orders and activity."
      ),
      toNode("div", { className: "flex items-center gap-2" }, [
        toButton(null, "Add customer"),
        toButton("outline", "Import from CSV"),
      ]),
    ]
  );

const toSignInCard = (): BlockNode => {
  const card = toCard({
    className: "w-full max-w-sm",
    content: [
      toNode("form", { className: "flex flex-col gap-4" }, [
        toField(
          "auth-email",
          "Email",
          { name: "email", placeholder: "you@company.com", type: "email" },
          ""
        ),
        toField(
          "auth-password",
          "Password",
          { name: "password", type: "password" },
          ""
        ),
        toNode("Button", { type: "submit" }, ["Sign in"]),
      ]),
    ],
    contentClass: "",
    description: "Enter your email and password to continue.",
    footer: null,
    title: "Sign in",
  });

  const footer = toNode("CardFooter", { className: "justify-center" }, [
    toNode("span", { className: "text-sm text-muted-foreground" }, [
      "Forgot your password? Reset it by email.",
    ]),
  ]);

  return toNode(
    "div",
    { className: "flex min-h-[60vh] items-center justify-center p-6" },
    [toNode("Card", card.attrs, [...card.children, footer])]
  );
};

const toInboxRow = (name: string, badge: BlockNode): BlockNode =>
  toNode(
    "div",
    { className: "flex items-center justify-between rounded-md border p-3" },
    [toNode("span", { className: "text-sm font-medium" }, [name]), badge]
  );

const toInbox = (): BlockNode => {
  const rows = [
    toInboxRow("Avery Chen", toNode("Badge", NO_ATTRS, ["New"])),
    toInboxRow("Jordan Blake", toBadge("secondary", "Open")),
    toInboxRow("Priya Nair", toBadge("outline", "Closed")),
  ];

  return toCard({
    className: "",
    content: rows,
    contentClass: "flex flex-col gap-2",
    description: "3 unread messages",
    footer: null,
    title: "Inbox",
  });
};

const toMessage = (): BlockNode => {
  const body = toText(
    "text-sm",
    "Hi, I need to change the delivery date on order 10482. Can you help me before Friday?"
  );

  return toCard({
    className: "",
    content: [body],
    contentClass: "",
    description: "avery@northwind.co",
    footer: [toButton("outline", "Archive"), toButton(null, "Reply")],
    title: "Avery Chen",
  });
};

const toListDetail = (): BlockNode =>
  toNode("div", { className: "grid gap-4 lg:grid-cols-[320px_1fr]" }, [
    toInbox(),
    toMessage(),
  ]);

const STATE_TEMPLATES: readonly BlockTemplate[] = [
  {
    description:
      "A dashed panel with a title, a hint and two buttons for a list with no rows.",
    entity: null,
    id: "empty-state",
    kind: "empty-state",
    name: "Empty state",
    root: toEmptyState(),
  },
  {
    description:
      "A centered sign-in card with email and password fields and a submit button.",
    entity: null,
    id: "auth-sign-in",
    kind: "auth",
    name: "Sign-in card",
    root: toSignInCard(),
  },
  {
    description:
      "A list of items on the left and a detail card with actions on the right.",
    entity: null,
    id: "list-detail",
    kind: "list-detail",
    name: "List and detail",
    root: toListDetail(),
  },
];

export { STATE_TEMPLATES };
