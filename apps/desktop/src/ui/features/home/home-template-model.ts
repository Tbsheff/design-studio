import type { ProjectKind, RunLevel } from "@design-studio/contracts";

interface HomeTemplate {
  readonly id: string;
  readonly label: string;
  readonly prompt: string;
  readonly starterId?: string;
  readonly kind?: ProjectKind;
  readonly level?: RunLevel;
}

const HOME_TEMPLATES: HomeTemplate[] = [
  { id: "blank", label: "Blank", prompt: "" },
  {
    id: "mobile",
    label: "Mobile app",
    prompt: "Design a mobile app for ",
    starterId: "mobile-app",
  },
  {
    id: "slides",
    label: "Slides",
    prompt: "Make a slide deck about ",
    starterId: "deck",
  },
  {
    id: "document",
    label: "Document",
    prompt: "Write and lay out a document about ",
    starterId: "docs",
  },
  {
    id: "wireframe",
    label: "Wireframe",
    level: "wireframe",
    prompt: "Wireframe ",
  },
  { id: "animation", label: "Animation", prompt: "Make an animated " },
  {
    id: "mockups",
    kind: "react",
    label: "UI mockups",
    prompt: "Make UI mockups for ",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    prompt: "Prototype a dashboard for ",
    starterId: "dashboard",
  },
  {
    id: "landing",
    label: "Landing page",
    prompt: "Design a landing page for ",
    starterId: "landing",
  },
  {
    id: "form",
    label: "Form",
    prompt: "Design a form for ",
    starterId: "form",
  },
  { id: "email", label: "HTML email", prompt: "Design an HTML email for " },
  {
    id: "pairing",
    label: "Color + type pairing",
    prompt: "Make a color and type pairing sheet for ",
  },
];

export { HOME_TEMPLATES };

export type { HomeTemplate };
