import { describe, expect, it } from "vitest";

import {
  layoutKey,
  parseStateFile,
  pickState,
  recordState,
} from "./window-state.js";
import type { DisplayInfo } from "./window-state.js";

const laptop: DisplayInfo = {
  bounds: { height: 982, width: 1512, x: 0, y: 0 },
  id: 1,
  workArea: { height: 957, width: 1512, x: 0, y: 25 },
};

const monitor: DisplayInfo = {
  bounds: { height: 1440, width: 2560, x: 1512, y: 0 },
  id: 2,
  workArea: { height: 1415, width: 2560, x: 1512, y: 25 },
};

describe("window state per display layout", () => {
  it("keeps one entry per display layout and restores the one that matches", () => {
    let file = parseStateFile(null);
    file = recordState(file, [laptop], {
      bounds: { height: 800, width: 1200, x: 10, y: 40 },
      maximized: false,
    });
    file = recordState(file, [laptop, monitor], {
      bounds: { height: 1200, width: 2000, x: 1600, y: 60 },
      maximized: true,
    });
    expect(Object.keys(file.layouts)).toHaveLength(2);
    expect(pickState(file, [laptop])?.bounds.x).toBe(10);
    expect(pickState(file, [monitor, laptop])?.maximized).toBe(true);
  });

  it("falls back to the last layout only when it is still on a display", () => {
    const file = recordState(parseStateFile(null), [laptop, monitor], {
      bounds: { height: 1200, width: 2000, x: 1600, y: 60 },
      maximized: false,
    });

    expect(pickState(file, [laptop])).toBeNull();

    const onLaptop = recordState(parseStateFile(null), [laptop, monitor], {
      bounds: { height: 700, width: 1000, x: 20, y: 40 },
      maximized: false,
    });

    expect(pickState(onLaptop, [laptop])?.bounds.x).toBe(20);
  });

  it("reads the P0 single-state file and drops junk", () => {
    expect(
      pickState(
        parseStateFile({
          bounds: { height: 700, width: 900, x: 5, y: 30 },
          maximized: false,
        }),
        [laptop]
      )?.bounds.width
    ).toBe(900);
    expect(
      parseStateFile({ last: "a", layouts: { a: { bounds: { x: "no" } } } })
    ).toEqual({ last: null, layouts: {} });
    expect(layoutKey([monitor, laptop])).toBe(layoutKey([laptop, monitor]));
  });
});
