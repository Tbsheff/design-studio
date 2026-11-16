import type { RunView, ToolRow } from "./run-state-model.js";

type Segment =
  | { kind: "text"; key: string; text: string; open: boolean }
  | { kind: "thinking"; key: string; text: string; open: boolean }
  | { kind: "tools"; key: string; tools: ToolRow[] }
  | { kind: "user"; key: string; text: string; isUsed: boolean };

type Part = RunView["parts"][number];

const appendTool = (segments: Segment[], tool: ToolRow): void => {
  const last = segments.at(-1);

  if (last?.kind === "tools") {
    last.tools.push(tool);

    return;
  }

  segments.push({
    key: `tools-${tool.toolUseId}`,
    kind: "tools",
    tools: [tool],
  });
};

const appendPart = (
  segments: Segment[],
  part: Part,
  index: number,
  byId: ReadonlyMap<string, ToolRow>
): void => {
  if (part.kind === "tool") {
    const tool = byId.get(part.toolUseId);

    if (tool) {
      appendTool(segments, tool);
    }

    return;
  }

  if (part.kind === "user") {
    segments.push({
      isUsed: false,
      key: `user-${part.id}`,
      kind: "user",
      text: part.text,
    });

    return;
  }

  segments.push({
    key: `${part.kind}-${index}`,
    kind: part.kind,
    open: Boolean(part.open),
    text: part.text,
  });
};

const isAgentWork = (segment: Segment): boolean =>
  segment.kind === "tools" ||
  segment.kind === "thinking" ||
  (segment.kind === "text" && segment.text.trim() !== "");

const toUsedNote = (
  segments: readonly Segment[],
  segment: Segment,
  index: number
): Segment => {
  if (segment.kind !== "user") {
    return segment;
  }

  return { ...segment, isUsed: segments.slice(index + 1).some((later) => isAgentWork(later)) };
};

const segmentsOf = (run: RunView): Segment[] => {
  const byId = new Map(run.tools.map((tool) => [tool.toolUseId, tool]));
  const segments: Segment[] = [];

  for (const [index, part] of run.parts.entries()) {
    appendPart(segments, part, index, byId);
  }

  return segments.map((segment, index) => toUsedNote(segments, segment, index));
};

interface RunLayout {
  steps: Segment[];
  sent: Segment[];
  tail: Segment[];
}

const findLast = (
  segments: Segment[],
  isMatch: (segment: Segment) => boolean
): number => segments.findLastIndex((segment) => isMatch(segment));

const isFilledText = (segment: Segment): boolean =>
  segment.kind === "text" && Boolean(segment.text.trim());

const toReply = (
  segments: Segment[],
  running: boolean,
  lastTool: number
): Segment | null => {
  const lastText = findLast(segments, isFilledText);

  if (!running && lastText !== -1 && lastText < lastTool) {
    return segments[lastText] ?? null;
  }

  return null;
};

const toBucket = (
  segment: Segment,
  isEarly: boolean,
  layout: RunLayout
): Segment[] => {
  if (!isEarly) {
    return layout.tail;
  }

  if (segment.kind === "user") {
    return layout.sent;
  }

  return layout.steps;
};

const layoutOf = (segments: Segment[], running: boolean): RunLayout => {
  const lastTool = findLast(segments, (segment) => segment.kind === "tools");
  const reply = toReply(segments, running, lastTool);
  const steps: Segment[] = [];
  const sent: Segment[] = [];
  const tail: Segment[] = [];

  for (const [index, segment] of segments.entries()) {
    const isEarly = index <= lastTool;

    if (segment !== reply) {
      toBucket(segment, isEarly, { sent, steps, tail }).push(segment);
    }
  }

  if (reply) {
    tail.unshift(reply);
  }

  return { sent, steps, tail };
};

export { layoutOf, segmentsOf };

export type { RunLayout, Segment };
