import { zoomKeyOf } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  cleanFramePath,
  parseLayout,
} from "./features/canvas/canvas-frames-model";
import {
  addFrame,
  boundsOf,
  defaultLayout,
  followDirection,
  FRAME_GAP,
  frameName,
  keepDirection,
  moveFrame,
  placeDirections,
  removeFrame,
  resizeActive,
  resizeFrame,
  setFramePath,
  viewportOf,
  withFramePath,
} from "./features/canvas/index";

const desktop = { height: 900, preset: "desktop" as const, width: 1440 };

describe("canvas frames", () => {
  it("adds frames to the right of the others and keeps the bounds", () => {
    expect.hasAssertions();

    let layout = defaultLayout(desktop);
    layout = addFrame(layout, { height: 1024, width: 768 });
    layout = addFrame(layout, { height: 844, width: 390 });
    expect(layout.frames.map((f) => [f.id, f.x, f.y])).toStrictEqual([
      ["f1", 0, 0],
      ["f2", 1440 + FRAME_GAP, 0],
      ["f3", 1440 + 768 + FRAME_GAP * 2, 0],
    ]);
    expect(boundsOf(layout.frames)).toStrictEqual({
      height: 1024,
      width: 1440 + 768 + 390 + FRAME_GAP * 2,
      x: 0,
      y: 0,
    });
  }, 0);

  it("moves, resizes and removes frames; the last frame stays", () => {
    expect.hasAssertions();

    let layout = addFrame(defaultLayout(desktop), { height: 844, width: 390 });
    layout = moveFrame(layout, "f2", 10.4, -20.6);
    expect(layout.frames[1]).toMatchObject({ x: 1530, y: -21 });
    layout = resizeActive(layout, 1000, 700);
    expect(
      frameName(layout.frames[0] as { width: number; height: number })
    ).toBe("1000 × 700");
    layout = removeFrame(layout, "f1");
    expect(layout.activeId).toBe("f2");
    expect(removeFrame(layout, "f2")).toBe(layout);
    expect(viewportOf({ height: 844, width: 390 })).toStrictEqual({
      height: 844,
      preset: "mobile",
      width: 390,
    });
  }, 0);

  it("drops bad stored data", () => {
    expect.hasAssertions();

    expect(
      parseLayout({
        activeId: "f1",
        frames: [{ height: 900, id: "f1", width: 10, x: 0, y: 0 }],
      })
    ).toBeNull();
    expect(
      parseLayout({
        activeId: "x",
        frames: [{ height: 900, id: "x", width: 1440, x: 0, y: 0 }],
      })
    ).toBeNull();
    expect(
      parseLayout({
        activeId: "f9",
        frames: [{ height: 900, id: "f2", width: 1440, x: 5, y: 6 }],
      })
    ).toStrictEqual({
      activeId: "f2",
      frames: [{ height: 900, id: "f2", width: 1440, x: 5, y: 6 }],
    });
  }, 0);
});

describe("frames per direction", () => {
  const group = ["va", "vb", "vc"];

  it("loads old records without a direction and keeps a valid direction and path", () => {
    expect.hasAssertions();

    const old = {
      activeId: "f1",
      frames: [{ height: 900, id: "f1", width: 1440, x: 0, y: 0 }],
    };

    expect(parseLayout(old)).toStrictEqual(old);

    const stored = {
      activeId: "f1",
      frames: [
        {
          directionId: "d_1",
          height: 900,
          id: "f1",
          path: "about.html",
          width: 1440,
          x: 0,
          y: 0,
        },
        {
          directionId: "../x",
          height: 844,
          id: "f2",
          path: "../secret",
          width: 390,
          x: 0,
          y: 0,
        },
      ],
    };

    expect(parseLayout(stored)?.frames).toStrictEqual([
      {
        directionId: "d_1",
        height: 900,
        id: "f1",
        path: "about.html",
        width: 1440,
        x: 0,
        y: 0,
      },
      { height: 844, id: "f2", width: 390, x: 0, y: 0 },
    ]);
  }, 0);

  it("places one frame per variation in a row under the others and binds the old frame", () => {
    expect.hasAssertions();

    const layout = placeDirections(
      defaultLayout(desktop),
      group,
      "main",
      false
    );

    expect(layout.activeId).toBe("f1");
    expect(
      layout.frames.map((f) => [f.id, f.directionId, f.x, f.y])
    ).toStrictEqual([
      ["f1", "main", 0, 0],
      ["f2", "va", 0, 900 + FRAME_GAP * 2],
      ["f3", "vb", 1440 + FRAME_GAP, 900 + FRAME_GAP * 2],
      ["f4", "vc", (1440 + FRAME_GAP) * 2, 900 + FRAME_GAP * 2],
    ]);
    expect(placeDirections(layout, group, "main", false)).toStrictEqual(layout);
  }, 0);

  it("drops the empty source frame when asked", () => {
    expect.hasAssertions();

    const layout = placeDirections(defaultLayout(desktop), group, "main", true);
    expect(layout.frames.map((f) => f.directionId)).toStrictEqual(group);
    expect(layout.activeId).toBe(layout.frames[0]?.id);
  }, 0);

  it("keep removes the other variation frames only and makes the kept frame active", () => {
    expect.hasAssertions();

    const placed = placeDirections(
      defaultLayout(desktop),
      group,
      "main",
      false
    );

    const kept = keepDirection(placed, "vc", group);
    expect(kept.frames.map((f) => f.directionId)).toStrictEqual(["main", "vc"]);
    expect(kept.activeId).toBe("f4");
    const back = placeDirections(kept, group, "vc", false);
    expect(back.frames.map((f) => f.directionId).sort()).toStrictEqual([
      "main",
      "va",
      "vb",
      "vc",
    ]);
    expect(new Set(back.frames.map((f) => f.id)).size).toBe(4);
  }, 0);

  it("follows a direction change from outside the canvas", () => {
    expect.hasAssertions();

    const placed = placeDirections(
      defaultLayout(desktop),
      group,
      "main",
      false
    );

    expect(followDirection(placed, "vb").activeId).toBe("f3");
    expect(followDirection(placed, "main")).toBe(placed);
    const rebound = followDirection(placed, "other");
    expect(rebound.frames.find((f) => f.id === "f1")?.directionId).toBe(
      "other"
    );

    const unbound = addFrame(defaultLayout(desktop), {
      height: 844,
      width: 390,
    });

    expect(followDirection(unbound, "any")).toBe(unbound);
  }, 0);

  it("resizes a frame with a floor of 240 and whole pixels", () => {
    expect.hasAssertions();

    const layout = resizeFrame(defaultLayout(desktop), "f1", 100.4, 1000.6);
    expect(layout.frames[0]).toMatchObject({ height: 1001, width: 240 });
    expect(resizeFrame(layout, "nope", 500, 500)).toBe(layout);
  }, 0);

  it("accepts only relative paths without dot segments", () => {
    expect.hasAssertions();

    expect(cleanFramePath(" /about.html ")).toBe("about.html");
    expect(cleanFramePath("docs/intro.html")).toBe("docs/intro.html");
    expect(cleanFramePath("")).toBe("");

    for (const bad of [
      "../x.html",
      "a/../../b",
      "./a",
      String.raw`a\b`,
      "https://x.test/",
      "a?b",
      "%2e%2e/x",
      "a b",
    ]) {
      expect(cleanFramePath(bad)).toBeNull();
    }

    const layout = setFramePath(defaultLayout(desktop), "f1", "about.html");
    expect(layout.frames[0]?.path).toBe("about.html");
    expect(setFramePath(layout, "f1", "../x")).toBe(layout);
    expect(setFramePath(layout, "f1", "").frames[0]).not.toHaveProperty("path");
  }, 0);

  it("puts the path under the direction folder and keeps the query", () => {
    expect.hasAssertions();

    expect(withFramePath("http://p.localhost:1/d1/?t=1", "about.html")).toBe(
      "http://p.localhost:1/d1/about.html?t=1"
    );
    expect(
      withFramePath("http://p.localhost:1/d1/index.html", "docs/a.html")
    ).toBe("http://p.localhost:1/d1/docs/a.html");
    expect(withFramePath("http://localhost:5300/", "pricing")).toBe(
      "http://localhost:5300/pricing"
    );
    expect(withFramePath("http://localhost:5300/", undefined)).toBe(
      "http://localhost:5300/"
    );
  }, 0);
});

describe(zoomKeyOf, () => {
  const key = (
    k: string,
    code: string,
    mods: Partial<{
      ctrlKey: boolean;
      metaKey: boolean;
      altKey: boolean;
      shiftKey: boolean;
    }> = {}
  ) =>
    zoomKeyOf({
      altKey: false,
      code,
      ctrlKey: false,
      key: k,
      metaKey: false,
      shiftKey: false,
      ...mods,
    });

  it("maps Figma keys", () => {
    expect.hasAssertions();

    expect(key("!", "Digit1", { shiftKey: true })).toBe("fit");
    expect(key("@", "Digit2", { shiftKey: true })).toBe("selection");
    expect(key(")", "Digit0", { shiftKey: true })).toBe("actual");
    expect(key("0", "Digit0", { metaKey: true })).toBe("actual");
    expect(key("1", "Digit1", { metaKey: true })).toBe("fit");
    expect(key("=", "Equal", { metaKey: true })).toBe("in");
    expect(key("-", "Minus", { ctrlKey: true })).toBe("out");
    expect(key("=", "Equal")).toBe("in");
    expect(key("+", "Equal", { shiftKey: true })).toBe("in");
    expect(key("-", "Minus")).toBe("out");
    expect(key("1", "Digit1")).toBeNull();
    expect(key("¡", "Digit1", { altKey: true })).toBeNull();
  }, 0);
});
