import type { ExportFormat } from "@design-studio/contracts/export";
import type { IconName } from "@design-studio/ui";

interface FormatInfo {
  id: ExportFormat;
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
    action: "Create handoff",
    hint: "A folder for a coding agent: HANDOFF.md, tokens, screens and source.",
    icon: "terminal",
    id: "handoff",
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

export type { ExportStatus, FormatInfo };
