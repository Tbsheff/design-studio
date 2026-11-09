import type { IconName, ProjectHit, RouteHit } from "./deps.js";
import type { Command } from "./registry.js";

type RowKind = "command" | "file" | "project" | "route" | "new";

interface Row {
  key: string;
  kind: RowKind;
  group: string;
  title: string;
  marks: number[];
  run: () => void;
  meta?: string;
  icon?: IconName;
  tone?: "brand" | "accent";
  hit?: ProjectHit;
  keys?: string;
  disabled?: string;
  note?: string;
  commandId?: string;
}

interface RowActions {
  openProject: (id: string, route?: string) => void;
  newPrototype: (prompt: string) => void;
}

interface RowInput {
  query: string;
  commands: Command[];
  projects: ProjectHit[];
  routes: RouteHit[];
  recent: string[];
  current: string | null;
  desktop: boolean;
  mac: boolean;
  actions: RowActions;
}

interface Scored {
  best: number;
  rows: Row[];
}

export type { Row, RowActions, RowInput, RowKind, Scored };
