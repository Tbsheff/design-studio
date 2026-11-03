import { memo, useMemo } from "react";

import { ToolChips, ToolSummary } from "../../components/ToolChips.js";
import type { RunView, ToolRow } from "../../runState.js";
import { AssistantText, SentWhileRunning, Thinking } from "./chat-parts.js";

type Segment =
  | { kind: "text"; key: string; text: string; open: boolean }
  | { kind: "thinking"; key: string; text: string; open: boolean }
  | { kind: "tools"; key: string; tools: ToolRow[] }
  | { kind: "user"; key: string; text: string };

function segmentsOf(run: RunView): Segment[] {
  const byId = new Map(run.tools.map((tool) => [tool.toolUseId, tool]));
  const segments: Segment[] = [];
  run.parts.forEach((part, index) => {
    if (part.kind === "tool") {
      const tool = byId.get(part.toolUseId);

      if (!tool) {
        return;
      }

      const last = segments.at(-1);

      if (last?.kind === "tools") {
        last.tools.push(tool);
      } else {
        segments.push({
          kind: "tools",
          key: `tools-${part.toolUseId}`,
          tools: [tool],
        });
      }
    } else if (part.kind === "user") {
      segments.push({ kind: "user", key: `user-${part.id}`, text: part.text });
    } else {
      segments.push({
        kind: part.kind,
        key: `${part.kind}-${index}`,
        text: part.text,
        open: Boolean(part.open),
      });
    }
  });

  return segments;
}

const ToolSegment = memo(
  function ToolSegment({
    tools,
    running,
    workTree,
  }: {
    tools: ToolRow[];
    running: boolean;
    workTree: string | null;
  }) {
    return (
      <ToolChips tools={tools} running={running} workTree={workTree} flat />
    );
  },
  (a, b) =>
    a.running === b.running &&
    a.workTree === b.workTree &&
    a.tools.length === b.tools.length &&
    a.tools.every((tool, index) => tool === b.tools[index])
);

function SegmentView({
  segment,
  running,
  workTree,
}: {
  segment: Segment;
  running: boolean;
  workTree: string | null;
}) {
  if (segment.kind === "tools") {
    return (
      <ToolSegment
        tools={segment.tools}
        running={running}
        workTree={workTree}
      />
    );
  }

  if (segment.kind === "user") {
    return <SentWhileRunning text={segment.text} />;
  }

  if (segment.kind === "thinking") {
    return <Thinking text={segment.text} live={running && segment.open} />;
  }

  return (
    <AssistantText text={segment.text} streaming={running && segment.open} />
  );
}

interface RunLayout {
  steps: Segment[];
  sent: Segment[];
  tail: Segment[];
}

function layoutOf(segments: Segment[], running: boolean): RunLayout {
  let lastTool = -1;
  let lastText = -1;
  segments.forEach((segment, index) => {
    if (segment.kind === "tools") {
      lastTool = index;
    }

    if (segment.kind === "text" && segment.text.trim()) {
      lastText = index;
    }
  });

  const reply =
    !running && lastText !== -1 && lastText < lastTool
      ? segments[lastText]
      : undefined;

  const steps: Segment[] = [];
  const sent: Segment[] = [];
  const tail: Segment[] = [];
  segments.forEach((segment, index) => {
    if (segment === reply) {
      return;
    }

    if (segment.kind === "user") {
      (index <= lastTool ? sent : tail).push(segment);
    } else {
      (index <= lastTool ? steps : tail).push(segment);
    }
  });

  if (reply) {
    tail.unshift(reply);
  }

  return { steps, sent, tail };
}

function RunParts({
  run,
  running,
  workTree,
}: {
  run: RunView;
  running: boolean;
  workTree: string | null;
}) {
  const layout = useMemo(
    () => layoutOf(segmentsOf(run), running),
    [run.parts, run.tools, running]
  );

  return (
    <>
      {layout.steps.length > 0 && (
        <ToolSummary tools={run.tools}>
          {layout.steps.map((segment) => (
            <SegmentView
              key={segment.key}
              segment={segment}
              running={running}
              workTree={workTree}
            />
          ))}
        </ToolSummary>
      )}
      {layout.sent.map((segment) => (
        <SegmentView
          key={segment.key}
          segment={segment}
          running={running}
          workTree={workTree}
        />
      ))}
      {layout.tail.map((segment) => (
        <SegmentView
          key={segment.key}
          segment={segment}
          running={running}
          workTree={workTree}
        />
      ))}
    </>
  );
}

export { RunParts };
