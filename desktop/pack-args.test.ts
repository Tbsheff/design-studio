import { describe, expect, it } from "vitest";

import { toBuilderArgs, toPackOptions } from "./pack-args.js";

describe("desktop pack arguments", () => {
  it("signs ad-hoc, publishes nothing and writes no update feed by default", () => {
    const args = toBuilderArgs(toPackOptions({}));
    expect(args).toContain("-c.mac.identity=-");
    expect(args.join(" ")).toContain("--publish never");
    expect(args.some((arg) => arg.startsWith("-c.publish"))).toBe(false);
  });

  it("takes a Developer ID name and an http feed only from explicit env", () => {
    const args = toBuilderArgs(
      toPackOptions({
        STUDIO_SIGN_IDENTITY: "Developer ID Application: Example (TEAM123456)",
        STUDIO_UPDATE_URL: "https://updates.example.com/studio/",
        STUDIO_PACK_OUT: "/tmp/out",
      })
    );
    expect(args).toEqual(
      expect.arrayContaining([
        "-c.mac.identity=Developer ID Application: Example (TEAM123456)",
        "-c.publish.provider=generic",
        "-c.publish.url=https://updates.example.com/studio/",
        "-c.directories.output=/tmp/out",
        "--publish",
        "never",
      ])
    );
    expect(() =>
      toPackOptions({ STUDIO_UPDATE_URL: "file:///tmp/feed" })
    ).toThrow(/http/);
  });
});
