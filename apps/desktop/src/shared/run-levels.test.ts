import { DEFAULT_SETTINGS } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  LEVEL_PRESETS,
  levelOf,
  resolveRunConfig,
  WIREFRAME_MODEL,
} from "./run-levels";

describe("run level presets", () => {
  it("runs wireframe on Haiku, no skills, structure-only taste and errors-only checks", () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, "wireframe");
    expect(config).toMatchObject({
      level: "wireframe",
      model: WIREFRAME_MODEL,
      maxTurns: 12,
      criticModel: null,
    });
    expect(config.preset.skills).toBe(false);
    expect(config.preset.tasteAreas).toEqual(["layout", "behavior"]);
    expect(config.preset.checks).toMatchObject({
      quality: false,
      screenshots: false,
      critic: false,
      placeholder: "off",
    });
  });

  it("keeps prototype on the project model with tool checks and one loop", () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, "prototype");
    expect(config).toMatchObject({
      model: "claude-sonnet-5-5",
      maxTurns: 30,
      criticModel: null,
    });
    expect(config.preset.checks).toMatchObject({
      viewports: ["desktop", "mobile"],
      quality: true,
      screenshots: true,
      placeholder: "medium",
      fixLoops: 1,
    });
  });

  it("gives polish three sizes, a critic, three loops", () => {
    const config = resolveRunConfig(DEFAULT_SETTINGS, "polish");
    expect(config).toMatchObject({
      model: "claude-sonnet-5-5",
      maxTurns: 40,
      criticModel: "claude-sonnet-5-5",
    });
    expect(config.preset.checks).toMatchObject({
      viewports: ["desktop", "tablet", "mobile"],
      critic: true,
      fixLoops: 3,
      placeholder: "high",
    });
  });

  it("uses an Opus project model for polish and its critic, never for wireframe", () => {
    const settings = { ...DEFAULT_SETTINGS, model: "claude-opus-5-5" };
    expect(resolveRunConfig(settings, "polish")).toMatchObject({
      model: "claude-opus-5-5",
      criticModel: "claude-opus-5-5",
    });
    expect(resolveRunConfig(settings, "wireframe").model).toBe(WIREFRAME_MODEL);
  });

  it("keeps the preset turn limits as runaway guards", () => {
    expect(
      Object.fromEntries(
        Object.entries(LEVEL_PRESETS).map(([level, preset]) => [
          level,
          preset.maxTurns,
        ])
      )
    ).toEqual({ wireframe: 12, prototype: 30, polish: 40 });
    for (const preset of Object.values(LEVEL_PRESETS)) {
      expect(preset).not.toHaveProperty("maxBudgetUsd");
      expect(preset.hint).toMatch(/usually ~\$/);
      expect(preset.hint).not.toMatch(/\bcap\b|up to \$/i);
    }
  });

  it("takes the request level first, then the project default, then prototype", () => {
    expect(levelOf({ level: "polish" }, { defaultLevel: "wireframe" })).toBe(
      "polish"
    );
    expect(levelOf({}, { defaultLevel: "wireframe" })).toBe("wireframe");
    expect(levelOf({})).toBe("prototype");
  });

  it("has a label and a cost hint for every level", () => {
    for (const preset of Object.values(LEVEL_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.hint).toMatch(/\$/);
    }
  });
});
