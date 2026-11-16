import type { ExportFormat } from "@design-studio/contracts/export";
import type { IconName } from "@design-studio/ui";

type DialogFormat = ExportFormat | "flow";

interface FormatInfo {
  id: DialogFormat;
  isMore: boolean;
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
    isMore: false,
    label: "PNG",
  },
  {
    action: "Export PDF",
    hint: "One page per frame, at 2× for sharp print.",
    icon: "doc",
    id: "pdf",
    isMore: false,
    label: "PDF",
  },
  {
    action: "Export HTML",
    hint: "One file with CSS, fonts and images inside. Opens offline.",
    icon: "code",
    id: "html",
    isMore: false,
    label: "HTML",
  },
  {
    action: "Export zip",
    hint: "The project files of this version as a zip.",
    icon: "folder",
    id: "zip",
    isMore: false,
    label: "Source",
  },
  {
    action: "Export SVG",
    hint: "Vector shapes and live text, with font names. Pictures stay embedded. Many frames download as a zip.",
    icon: "pencil",
    id: "svg",
    isMore: true,
    label: "SVG",
  },
  {
    action: "Export PPTX",
    hint: "One slide per frame, or per slide of a deck, with text, boxes, shadows, gradients, SVG icons and images you can edit in Keynote or PowerPoint.",
    icon: "play",
    id: "pptx",
    isMore: true,
    label: "PPTX",
  },
  {
    action: "Export video",
    hint: "A click-through video of the prototype: a cursor clicks each saved link from the start frame. Save it as webm, mp4 or gif.",
    icon: "play",
    id: "flow",
    isMore: true,
    label: "Prototype video",
  },
  {
    action: "Create handoff",
    hint: "A folder for a coding agent: HANDOFF.md, tokens, screens and source.",
    icon: "terminal",
    id: "handoff",
    isMore: true,
    label: "Handoff",
  },
];

const MOBILE_MAX = 600;
const MOBILE_FRAME = { height: 844, name: "Mobile", width: 390 };

type ExportStatus =
  | { kind: "idle" }
  | { kind: "busy"; startedAt: number }
  | { kind: "done"; text: string; note: string | null; reveal: boolean }
  | { kind: "error"; text: string };

const IDLE_STATUS: ExportStatus = { kind: "idle" };

export { FORMATS, IDLE_STATUS, MOBILE_FRAME, MOBILE_MAX };

export type { DialogFormat, ExportStatus, FormatInfo };
