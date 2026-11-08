import { isSharedLayout } from "@design-studio/contracts/usage-scope";
import type {
  ComponentUsage,
  EditScope,
  EditScopeChoice,
} from "@design-studio/contracts/usage-scope";
import type { CSSProperties } from "react";

const BOX_ROOM = 72;
const BOX_WIDTH = 320;
const BOX_OFFSET = 8;
const MIN_ROUTES = 2;

interface BoxRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface UsageFields {
  file: string;
  projectId: string;
  route?: string;
  usedAt?: string;
}

const usageInput = (
  projectId: string,
  file: string,
  usedAt: string | null,
  route: string | null
): UsageFields => {
  const fields: UsageFields = { file, projectId };

  if (usedAt) {
    fields.usedAt = usedAt;
  }

  if (route) {
    fields.route = route;
  }

  return fields;
};

const scopeOf = (
  usage: ComponentUsage | null,
  choice: EditScopeChoice
): EditScope | null => {
  if (!usage || usage.routes.length < MIN_ROUTES) {
    return null;
  }

  const site = usage.callSite;

  const scope: EditScope = {
    choice,
    component: usage.component,
    file: usage.file,
    routes: usage.routes.map((route) => route.route),
  };

  if (isSharedLayout(site)) {
    scope.choice = "all";
  }

  if (site) {
    scope.callSite = {
      file: site.file,
      kind: site.kind,
      pageFile: site.pageFile,
    };
  }

  return scope;
};

const toSharedUsage = (usage: ComponentUsage | null): ComponentUsage | null => {
  if (usage && usage.routes.length > 1) {
    return usage;
  }

  return null;
};

const toBoxStyle = (
  rect: BoxRect,
  zoom: number,
  frame: { width: number; height: number }
): CSSProperties => {
  const isAbove =
    rect.y + rect.height + BOX_ROOM / zoom > frame.height &&
    rect.y > BOX_ROOM / zoom;

  const left = Math.max(0, Math.min(rect.x, frame.width - BOX_WIDTH / zoom));
  let top = rect.y + rect.height;
  let shift = `${BOX_OFFSET}px`;

  if (isAbove) {
    top = rect.y;
    shift = `calc(-100% - ${BOX_OFFSET}px)`;
  }

  return { left, top, transform: `scale(${1 / zoom}) translateY(${shift})` };
};

export { scopeOf, toBoxStyle, toSharedUsage, usageInput };

export type { UsageFields };
