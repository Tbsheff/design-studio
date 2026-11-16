import type { ExportFormat } from "@design-studio/contracts/export";
import type { IconName } from "@design-studio/ui";

type DialogFormat = ExportFormat | "flow";

interface FormatInfo {
  id: DialogFormat;
  label: string;
  icon: IconName;
  hint: string;
  action: string;
}

const FORMATS: FormatInfo[] = [
  {
    action: "Export PNG",
    hint: "One image per frame. Many frames download as a zip.",
    icon: "image",
    id: "png",
    label: "PNG",
  },
  {
    action: "Export SVG",
    hint: "Vector shapes and live text, with font names. Pictures stay embedded. Many frames download as a zip.",
    icon: "pencil",
    id: "svg",
    label: "SVG",
  },
  {
    action: "Export PDF",
    hint: "One page per frame, at 2× for sharp print.",
    icon: "doc",
    id: "pdf",
    label: "PDF",
  },
  {
    action: "Export PPTX",
    hint: "One slide per frame, or per slide of a deck, with text, boxes, shadows, gradients, SVG icons and images you can edit in Keynote or PowerPoint.",
    icon: "play",
    id: "pptx",
    label: "PPTX",
  },
  {
    action: "Export HTML",
    hint: "One file with CSS, fonts and images inside. Opens offline.",
    icon: "code",
    id: "html",
    label: "HTML",
  },
  {
    action: "Export zip",
    hint: "The project files of this version as a zip.",
    icon: "folder",
    id: "zip",
    label: "Source",
  },
  {
    action: "Export video",
    hint: "A click-through video of the prototype: a cursor clicks each saved link from the start frame. Save it as webm, mp4 or gif.",
    icon: "play",
    id: "flow",
    label: "Prototype video",
  },
  {
    action: "Create handoff",
    hint: "A folder for a coding agent: HANDOFF.md, tokens, screens and source.",
    icon: "terminal",
    id: "handoff",
    label: "Handoff",
  },
];

type FormatGroupId = "png" | "svg" | "pdf" | "code" | "more";

interface FormatGroup {
  readonly icon: IconName;
  readonly id: FormatGroupId;
  readonly label: string;
  readonly members: readonly DialogFormat[];
}

const FORMAT_GROUPS: readonly FormatGroup[] = [
  { icon: "image", id: "png", label: "PNG", members: ["png"] },
  { icon: "pencil", id: "svg", label: "SVG", members: ["svg"] },
  { icon: "doc", id: "pdf", label: "PDF", members: ["pdf"] },
  { icon: "code", id: "code", label: "Code", members: ["html", "zip"] },
  {
    icon: "more",
    id: "more",
    label: "More formats",
    members: ["pptx", "flow", "handoff"],
  },
];

const toFormatGroup = (format: DialogFormat): FormatGroup =>
  FORMAT_GROUPS.find((group) => group.members.includes(format)) ??
  (FORMAT_GROUPS[0] as FormatGroup);

interface FormatChoice<Value extends string> {
  readonly icon: IconName | null;
  readonly id: Value;
  readonly label: string;
}

const FORMAT_BY_ID = new Map(FORMATS.map((entry) => [entry.id, entry]));

const GROUP_CHOICES: readonly FormatChoice<FormatGroupId>[] = FORMAT_GROUPS.map(
  (group) => ({
    icon: group.icon,
    id: group.id,
    label: group.label,
  })
);

const toMemberChoices = (group: FormatGroup): FormatChoice<DialogFormat>[] =>
  group.members.flatMap((id) => {
    const entry = FORMAT_BY_ID.get(id);

    if (!entry) {
      return [];
    }

    return [{ icon: null, id: entry.id, label: entry.label }];
  });

const MOBILE_MAX = 600;
const MOBILE_FRAME = { height: 844, name: "Mobile", width: 390 };

type ExportStatus =
  | { kind: "idle" }
  | { kind: "busy"; startedAt: number }
  | { kind: "done"; text: string; note: string | null; reveal: boolean }
  | { kind: "error"; text: string };

const IDLE_STATUS: ExportStatus = { kind: "idle" };

export {
  FORMAT_GROUPS,
  FORMATS,
  GROUP_CHOICES,
  IDLE_STATUS,
  MOBILE_FRAME,
  MOBILE_MAX,
  toFormatGroup,
  toMemberChoices,
};

export type {
  DialogFormat,
  ExportStatus,
  FormatChoice,
  FormatGroup,
  FormatGroupId,
  FormatInfo,
};
