import type { McpApprovalOutcome } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";

import { pick } from "../../platform/pick.js";

const MCP_ACTIVE_MS = 60_000;

const FOLD_AT = 5;

const OUTCOME_VIEW: Record<
  McpApprovalOutcome,
  { readonly icon: IconName; readonly text: string }
> = {
  allow: { icon: "check", text: "Allowed" },
  closed: { icon: "alert", text: "Closed" },
  deny: { icon: "close", text: "Denied" },
  timeout: { icon: "alert", text: "Expired" },
};

const SECOND_MS = 1000;

const SECONDS_PER_MINUTE = 60;

const MINUTE_MS = SECOND_MS * SECONDS_PER_MINUTE;

const RECENT_MINUTES = 10;

const RECENT_MS = RECENT_MINUTES * MINUTE_MS;

const TICK_SECONDS = 10;

const TICK_MS = TICK_SECONDS * SECOND_MS;

const TOOL_ICONS = {
  add_comment: "comment",
  add_frame: "frame",
  add_route_frame: "frame",
  apply_design_system: "palette",
  arrange: "frame",
  attach_app: "plus",
  batch_edit: "layers",
  canvas_place: "frame",
  create_design_system: "palette",
  create_project: "plus",
  edit_element: "pencil",
  export: "download",
  insert_component: "component",
  measure: "scan",
  open_folder: "folder",
  redo: "reload",
  remove_frame: "trash",
  replace_style: "token",
  reply_comment: "comment",
  resolve_comment: "check",
  restore_version: "restore",
  save_design_system: "book",
  set_props: "component",
  set_token: "token",
  ship: "branch",
  undo: "undo",
  write_file: "file",
} as const satisfies Record<string, IconName>;

const toToolIcon = (tool: string, fallback: IconName): IconName => {
  if (Object.hasOwn(TOOL_ICONS, tool)) {
    return TOOL_ICONS[tool as keyof typeof TOOL_ICONS];
  }

  return fallback;
};

const countdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / SECOND_MS));
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);

  return `${minutes}:${String(total % SECONDS_PER_MINUTE).padStart(2, "0")}`;
};

const toBlockState = (isActive: boolean, count: number): string => {
  if (isActive) {
    return "Active";
  }

  return `${count} ${pick(count === 1, "edit", "edits")}`;
};

const isWithinMs = (at: number, windowMs: number): boolean =>
  Date.now() - at < windowMs;

export {
  FOLD_AT,
  MCP_ACTIVE_MS,
  OUTCOME_VIEW,
  RECENT_MS,
  SECOND_MS,
  TICK_MS,
  countdown,
  isWithinMs,
  toBlockState,
  toToolIcon,
};
