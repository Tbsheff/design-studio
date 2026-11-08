import type { SlotFallback } from "./types.js";

const toFallback = (
  tag: string,
  className: string,
  attrs: SlotFallback["attrs"],
  drop: readonly string[]
): SlotFallback => ({ attrs, className, drop, tag });

const BUTTON_CLASS =
  "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm";

const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

const BADGE_CLASS =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium";

const TAB_LIST_CLASS =
  "inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground";

const TAB_CLASS =
  "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium";

const CARD_CLASS =
  "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm";

const SLOT_FALLBACKS: ReadonlyMap<string, SlotFallback> = new Map([
  ["Badge", toFallback("span", BADGE_CLASS, {}, ["variant"])],
  ["Button", toFallback("button", BUTTON_CLASS, {}, ["variant", "size"])],
  ["Card", toFallback("div", CARD_CLASS, {}, [])],
  ["CardContent", toFallback("div", "px-6", {}, [])],
  ["CardDescription", toFallback("p", "text-sm text-muted-foreground", {}, [])],
  ["CardFooter", toFallback("div", "flex items-center px-6", {}, [])],
  ["CardHeader", toFallback("div", "flex flex-col gap-1.5 px-6", {}, [])],
  ["CardTitle", toFallback("h3", "font-semibold leading-none", {}, [])],
  ["Input", toFallback("input", INPUT_CLASS, {}, [])],
  ["Label", toFallback("label", "text-sm font-medium leading-none", {}, [])],
  ["Table", toFallback("table", "w-full caption-bottom text-sm", {}, [])],
  ["TableBody", toFallback("tbody", "", {}, [])],
  ["TableCell", toFallback("td", "p-3 align-middle", {}, [])],
  [
    "TableHead",
    toFallback(
      "th",
      "h-10 px-3 text-left align-middle font-medium text-muted-foreground",
      {},
      []
    ),
  ],
  ["TableHeader", toFallback("thead", "border-b", {}, [])],
  ["TableRow", toFallback("tr", "border-b", {}, [])],
  ["Tabs", toFallback("div", "flex flex-col", {}, ["defaultValue"])],
  ["TabsContent", toFallback("div", "", { role: "tabpanel" }, ["value"])],
  ["TabsList", toFallback("div", TAB_LIST_CLASS, { role: "tablist" }, [])],
  ["TabsTrigger", toFallback("button", TAB_CLASS, { role: "tab" }, ["value"])],
]);

export { SLOT_FALLBACKS };
