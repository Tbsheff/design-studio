import { toHeadingPlan } from "./heading.js";
import {
  GT,
  LT,
  toElement,
  toEscapedText,
  toMarkupText,
  toTextElement,
  toVoidElement,
} from "./markup.js";
import type { MarkupElement, MarkupFlavor } from "./markup.js";

type ScreenLayout = "blank" | "detail" | "form" | "list";

const INDENT_PAGE = 6;

const BUTTON_CLASS = "h-9 rounded-md border px-3 text-sm font-medium";

const CELL_CLASS = "px-4 py-3";

const HEAD_CELL_CLASS = "px-4 py-2 font-medium";

const LIST_ROWS = [
  ["Item one", "Active", "Today"],
  ["Item two", "Active", "Yesterday"],
  ["Item three", "Draft", "Last week"],
] as const;

const LIST_COLUMNS = ["Name", "Status", "Updated"] as const;

const toListToolbar = (): MarkupElement => {
  const search = toVoidElement("input", {
    class: "h-9 w-64 rounded-md border px-3 text-sm",
    placeholder: "Search",
    type: "search",
  });

  const action = toTextElement(
    "button",
    { class: BUTTON_CLASS, type: "button" },
    "New"
  );

  return toElement(
    "div",
    { class: "flex items-center justify-between gap-3" },
    [search, action]
  );
};

const toListTable = (): MarkupElement => {
  const heads = LIST_COLUMNS.map((column) =>
    toTextElement("th", { class: HEAD_CELL_CLASS }, column)
  );

  const head = toElement(
    "thead",
    { class: "border-b bg-muted/50 text-muted-foreground" },
    [toElement("tr", {}, heads)]
  );

  const rows = LIST_ROWS.map((row) => {
    const cells = row.map((text) =>
      toTextElement("td", { class: CELL_CLASS }, text)
    );

    return toElement("tr", { class: "border-b" }, cells);
  });

  const table = toElement("table", { class: "w-full text-left text-sm" }, [
    head,
    toElement("tbody", {}, rows),
  ]);

  return toElement("div", { class: "overflow-hidden rounded-lg border" }, [
    table,
  ]);
};

const toListBody = (): readonly MarkupElement[] => [
  toListToolbar(),
  toListTable(),
];

const DETAIL_ROWS = [
  ["Name", "Sample name"],
  ["Status", "Active"],
  ["Created", "Today"],
] as const;

const toDetailBody = (): readonly MarkupElement[] => {
  const rows = DETAIL_ROWS.flatMap(([label, value]) => [
    toTextElement("dt", { class: "text-muted-foreground" }, label),
    toTextElement("dd", {}, value),
  ]);

  const overview = toElement(
    "section",
    { class: "rounded-lg border p-4 lg:col-span-2" },
    [
      toTextElement("h2", { class: "mb-3 text-sm font-medium" }, "Overview"),
      toElement("dl", { class: "grid grid-cols-2 gap-3 text-sm" }, rows),
    ]
  );

  const activity = toElement("aside", { class: "rounded-lg border p-4" }, [
    toTextElement("h2", { class: "mb-3 text-sm font-medium" }, "Activity"),
    toTextElement(
      "p",
      { class: "text-sm text-muted-foreground" },
      "No activity yet."
    ),
  ]);

  return [
    toElement("div", { class: "grid gap-6 lg:grid-cols-3" }, [
      overview,
      activity,
    ]),
  ];
};

const toField = (
  id: string,
  label: string,
  control: MarkupElement
): MarkupElement => {
  const caption = toTextElement("span", { class: "font-medium" }, label);

  return toElement("label", { class: "grid gap-1 text-sm", for: id }, [
    caption,
    control,
  ]);
};

const toFormActions = (): MarkupElement => {
  const save = toTextElement(
    "button",
    {
      class:
        "h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground",
      type: "submit",
    },
    "Save"
  );

  const cancel = toTextElement(
    "button",
    { class: BUTTON_CLASS, type: "button" },
    "Cancel"
  );

  return toElement("div", { class: "flex gap-2" }, [save, cancel]);
};

const toFormBody = (): readonly MarkupElement[] => {
  const name = toVoidElement("input", {
    class: "h-9 rounded-md border px-3",
    id: "name",
    name: "name",
    type: "text",
  });

  const notes = toTextElement(
    "textarea",
    {
      class: "rounded-md border px-3 py-2",
      id: "notes",
      name: "notes",
      rows: "4",
    },
    ""
  );

  return [
    toElement("form", { class: "grid max-w-xl gap-4" }, [
      toField("name", "Name", name),
      toField("notes", "Notes", notes),
      toFormActions(),
    ]),
  ];
};

const toBodyNodes = (layout: ScreenLayout): readonly MarkupElement[] => {
  if (layout === "list") {
    return toListBody();
  }

  if (layout === "detail") {
    return toDetailBody();
  }

  if (layout === "form") {
    return toFormBody();
  }

  return [];
};

const toIndented = (text: string, spaces: number): string => {
  const pad = " ".repeat(spaces);

  return text
    .split("\n")
    .map((line) => {
      if (line === "") {
        return line;
      }

      return `${pad}${line}`;
    })
    .join("\n");
};

interface PageScope {
  readonly componentName: string;
  readonly fromDir: string;
  readonly layout: ScreenLayout;
  readonly sampleCode: string;
  readonly title: string;
  readonly toDir: string;
}

const toSpacer = (imports: readonly string[]): readonly string[] => {
  if (imports.length > 0) {
    return [""];
  }

  return [];
};

const toPageSource = (scope: PageScope): string => {
  const heading = toHeadingPlan(scope.sampleCode, {
    fromDir: scope.fromDir,
    title: scope.title,
    toDir: scope.toDir,
  });

  const body = toMarkupText(toBodyNodes(scope.layout), "jsx");
  const parts = [heading.jsx, body].filter((part) => part !== "");
  const inner = parts.map((part) => toIndented(part, INDENT_PAGE)).join("\n");
  const spacer = toSpacer(heading.imports);

  return [
    ...heading.imports,
    ...spacer,
    `export default function ${scope.componentName}() {`,
    "  return (",
    `    ${LT}main className="flex flex-col gap-6 p-6"${GT}`,
    inner,
    `    ${LT}/main${GT}`,
    "  );",
    "}",
    "",
  ].join("\n");
};

const HEAD_PATTERN = /<head\b[^>]*>(?<inner>[\s\S]*?)<\/head>/iu;

const BODY_OPEN_PATTERN = /<body\b[^>]*>/iu;

const TITLE_PATTERN = /<title\b[^>]*>[\s\S]*?<\/title>\s*/giu;

const FALLBACK_HEAD = [
  `${LT}meta charset="UTF-8" /${GT}`,
  `${LT}meta name="viewport" content="width=device-width, initial-scale=1.0" /${GT}`,
].join("\n");

interface HtmlScope {
  readonly layout: ScreenLayout;
  readonly sampleHtml: string;
  readonly title: string;
}

const toHeadLines = (sampleHtml: string): readonly string[] => {
  const head = HEAD_PATTERN.exec(sampleHtml)?.groups?.inner ?? FALLBACK_HEAD;

  return head
    .replaceAll(TITLE_PATTERN, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
};

const toHtmlScreen = (scope: HtmlScope): string => {
  const bodyOpen =
    BODY_OPEN_PATTERN.exec(scope.sampleHtml)?.[0] ?? `${LT}body${GT}`;

  const title = toEscapedText(scope.title);
  const flavor: MarkupFlavor = "html";

  const heading = toTextElement(
    "h1",
    { class: "text-2xl font-semibold tracking-tight" },
    title
  );

  const body = toMarkupText([heading, ...toBodyNodes(scope.layout)], flavor);

  return [
    `${LT}!doctype html${GT}`,
    `${LT}html lang="en"${GT}`,
    `  ${LT}head${GT}`,
    ...toHeadLines(scope.sampleHtml).map((line) => `    ${line}`),
    `    ${LT}title${GT}${title}${LT}/title${GT}`,
    `  ${LT}/head${GT}`,
    `  ${bodyOpen}`,
    `    ${LT}main class="flex flex-col gap-6 p-6"${GT}`,
    toIndented(body, INDENT_PAGE),
    `    ${LT}/main${GT}`,
    `  ${LT}/body${GT}`,
    `${LT}/html${GT}`,
    "",
  ].join("\n");
};

export { toHtmlScreen, toPageSource };

export type { ScreenLayout };
