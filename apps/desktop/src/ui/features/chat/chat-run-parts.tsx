import { memo, useMemo } from "react";
import type { ReactElement } from "react";

import { AssistantText, Thinking } from "./chat-parts.js";
import type { RunView, ToolRow } from "./run-state-model.js";
import { SentWhileRunning } from "./sent-while-running.js";
import { ToolChips, ToolSummary } from "./tool-chips.js";

type Segment =
  | { kind: "text"; key: string; text: string; open: boolean }
  | { kind: "thinking"; key: string; text: string; open: boolean }
  | { kind: "tools"; key: string; tools: ToolRow[] }
  | { kind: "user"; key: string; text: string };

const segmentsOf = (run: RunView): Segment[] => {
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
          key: `tools-${part.toolUseId}`,
          kind: "tools",
          tools: [tool],
        });
      }
    } else if (part.kind === "user") {
      segments.push({ key: `user-${part.id}`, kind: "user", text: part.text });
    } else {
      segments.push({
        key: `${part.kind}-${index}`,
        kind: part.kind,
        open: Boolean(part.open),
        text: part.text,
      });
    }
  });

  return segments;
};

const ToolSegment = memo(
  ({
    tools,
    running,
    workTree,
  }: {
    tools: ToolRow[];
    running: boolean;
    workTree: string | null;
  }) => <ToolChips tools={tools} running={running} workTree={workTree} flat />,
  (left, right) =>
    left.running === right.running &&
    left.workTree === right.workTree &&
    left.tools.length === right.tools.length &&
    left.tools.every((tool, index) => tool === right.tools[index])
);

ToolSegment.displayName = "ToolSegment";

const SegmentView = ({
  segment,
  running,
  workTree,
}: {
  segment: Segment;
  running: boolean;
  workTree: string | null;
}): ReactElement => {
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
};

interface RunLayout {
  steps: Segment[];
  sent: Segment[];
  tail: Segment[];
}

const layoutOf = (segments: Segment[], running: boolean): RunLayout => {
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

  return { sent, steps, tail };
};

const RunParts = ({
  run,
  running,
  workTree,
}: {
  run: RunView;
  running: boolean;
  workTree: string | null;
}): ReactElement => {
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
};

export { RunParts };
