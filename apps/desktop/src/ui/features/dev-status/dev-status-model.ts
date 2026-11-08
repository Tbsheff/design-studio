import { copy } from "./copy.js";
import type { DevStatusEntry } from "./dev-status-types.js";

type StatusValue = DevStatusEntry["status"];

interface FrameRef {
  readonly id: string;
  readonly label: string | null;
  readonly path: string | null;
}

interface StatusRow {
  readonly entry: DevStatusEntry | null;
  readonly frame: FrameRef;
}

interface StatusGroup {
  readonly rows: readonly StatusRow[];
  readonly status: StatusValue | null;
  readonly title: string;
}

const GROUPS: readonly {
  readonly status: StatusValue | null;
  readonly title: string;
}[] = [
  { status: "ready", title: copy.groupReady },
  { status: "in-review", title: copy.groupInReview },
  { status: "draft", title: copy.groupDraft },
  { status: "built", title: copy.groupBuilt },
  { status: null, title: copy.groupNone },
];

const toFrameName = (frame: FrameRef): string => {
  if (frame.label !== null && frame.label !== "") {
    return frame.label;
  }

  if (frame.path !== null && frame.path !== "") {
    return frame.path;
  }

  return frame.id;
};

const toRows = (
  frames: readonly FrameRef[],
  entries: readonly DevStatusEntry[]
): StatusRow[] =>
  frames.map((frame) => ({
    entry: entries.find((entry) => entry.frameId === frame.id) ?? null,
    frame,
  }));

const toGroups = (rows: readonly StatusRow[]): StatusGroup[] =>
  GROUPS.flatMap((group) => {
    const matching = rows.filter(
      (row) => (row.entry?.status ?? null) === group.status
    );

    if (matching.length === 0) {
      return [];
    }

    return [{ rows: matching, status: group.status, title: group.title }];
  });

const toHandoffPrompt = (
  projectId: string,
  row: StatusRow,
  entry: DevStatusEntry
): string => {
  const place = entry.route ?? entry.page ?? row.frame.path ?? "";

  const lines = [
    `Build the frame "${toFrameName(row.frame)}" (frame ${entry.frameId}, ${place}) of Design Studio project ${projectId}. It is marked ready for dev.`,
    "Call get_handoff or get_port_plan for this frame, then build it.",
  ];

  if (entry.note !== null && entry.note !== "") {
    lines.push(`Note from the designer: ${entry.note}`);
  }

  if (entry.isChangedSince) {
    lines.push(
      `The design changed after it was marked ready. Changed files: ${entry.changedFiles.join(", ")}.`
    );
  }

  return lines.join("\n");
};

export { toFrameName, toGroups, toHandoffPrompt, toRows };

export type { FrameRef, StatusGroup, StatusRow, StatusValue };
