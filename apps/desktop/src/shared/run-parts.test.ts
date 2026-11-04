import { describe, expect, it } from "vitest";

import { applyPartEvent, closeParts, withFinalText } from "./run-parts";
import type { PartEvent } from "./run-parts";

function play(events: PartEvent[]) {
  return events.reduce(applyPartEvent, [] as ReturnType<typeof applyPartEvent>);
}

describe("run parts", () => {
  it("keeps thinking, tools and text in event order and keeps every thinking block", () => {
    const parts = play([
      { text: "Thinking ", type: "run.thinking.delta" },
      { text: "Thinking A", type: "run.thinking" },
      { toolUseId: "t1", type: "run.tool.started" },
      { text: "Thinking B", type: "run.thinking" },
      { text: "Hel", type: "run.text.delta" },
      { text: "lo", type: "run.text.delta" },
      { text: "Hello", type: "run.text" },
    ]);

    expect(parts).toEqual([
      { kind: "thinking", text: "Thinking A" },
      { kind: "tool", toolUseId: "t1" },
      { kind: "thinking", text: "Thinking B" },
      { kind: "text", text: "Hello" },
    ]);
  });

  it("opens a new text part after a tool", () => {
    const parts = play([
      { text: "One", type: "run.text.delta" },
      { text: "One", type: "run.text" },
      { toolUseId: "t1", type: "run.tool.started" },
      { text: "Two", type: "run.text.delta" },
    ]);

    expect(parts.map((part) => part.kind)).toEqual(["text", "tool", "text"]);
    expect(closeParts(parts).at(-1)).toEqual({ kind: "text", text: "Two" });
  });

  it("adds a final report once and not a copy of the last text", () => {
    const parts = play([{ text: "Done.", type: "run.text" }]);
    expect(withFinalText(parts, "Done.")).toEqual(parts);
    expect(withFinalText(parts, "Done.\n\nLoop report")).toEqual([
      ...parts,
      { kind: "text", text: "Loop report" },
    ]);
  });
});
