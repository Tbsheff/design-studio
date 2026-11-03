import { describe, expect, it } from "vitest";

import {
  isDesktopContext,
  parseDeepLink,
  parsePickFolderRequest,
} from "../src/shared/desktop-link.js";
import { addRecent } from "./recents.js";
import { allowedRevealPath } from "./server-link.js";
import { feedSource, installDecision } from "./updater.js";

describe("deep links", () => {
  it("opens only a valid project id", () => {
    expect(parseDeepLink("designstudio://open?project=AbC_12-x")).toEqual({
      projectId: "AbC_12-x",
      type: "open-project",
    });
    expect(parseDeepLink("designstudio://open?project=../../etc")).toBeNull();
    expect(parseDeepLink("designstudio://open")).toBeNull();
    expect(parseDeepLink("https://example.com/open?project=abc")).toBeNull();
    expect(parseDeepLink("designstudio://delete?project=abc")).toBeNull();
    expect(parseDeepLink("designstudio://new")).toEqual({
      type: "new-project",
    });
    expect(parseDeepLink("not a url")).toBeNull();
  });

  it("accepts only well-formed renderer context", () => {
    expect(
      isDesktopContext({
        directionId: "main",
        projectId: "abc",
        running: false,
      })
    ).toBe(true);
    expect(
      isDesktopContext({ directionId: null, projectId: "/etc", running: false })
    ).toBe(false);
    expect(isDesktopContext({ directionId: null, projectId: null })).toBe(
      false
    );
  });
});

describe("reveal paths", () => {
  it("allows the data folder and the imported source only", () => {
    expect(
      allowedRevealPath("/data/projects/p/directions/main", "/data", null)
    ).toBe("/data/projects/p/directions/main");
    expect(allowedRevealPath("/Users/me/site", "/data", "/Users/me/site")).toBe(
      "/Users/me/site"
    );
    expect(allowedRevealPath("/data/../etc", "/data", null)).toBeNull();
    expect(allowedRevealPath("/data-other/x", "/data", null)).toBeNull();
    expect(
      allowedRevealPath("/Users/me", "/data", "/Users/me/site")
    ).toBeNull();
  });
});

describe("recents", () => {
  it("moves a reopened project to the top and keeps eight", () => {
    let list = Array.from({ length: 8 }, (_, n) => ({
      folder: `/f${n}`,
      id: `p${n}`,
      name: `P${n}`,
    }));

    list = addRecent(list, { folder: "/f5", id: "p5", name: "P5" });
    expect(list.map((item) => item.id).slice(0, 2)).toEqual(["p5", "p0"]);
    list = addRecent(list, { folder: "/new", id: "new", name: "New" });
    expect(list).toHaveLength(8);
    expect(list[0]?.id).toBe("new");
  });
});

describe("updater rules", () => {
  it("never installs while a run is active", () => {
    expect(installDecision(0)).toBe("prompt");
    expect(installDecision(2)).toBe("defer");
  });

  it("uses an http feed from the env only in packaged builds", () => {
    expect(
      feedSource(
        { STUDIO_UPDATE_FEED: "http://127.0.0.1:9999/" },
        false,
        "/nowhere"
      )
    ).toBeNull();
    expect(
      feedSource(
        { STUDIO_UPDATE_FEED: "http://127.0.0.1:9999/" },
        true,
        "/nowhere"
      )
    ).toEqual({ kind: "env", url: "http://127.0.0.1:9999/" });
    expect(
      feedSource({ STUDIO_UPDATE_FEED: "file:///tmp/feed" }, true, "/nowhere")
    ).toBeNull();
    expect(feedSource({}, true, "/nowhere")).toBeNull();
  });
});

describe("pick folder requests", () => {
  it("keeps a clean title and an absolute default path only", () => {
    expect(
      parsePickFolderRequest({
        defaultPath: "/Users/me/Sites",
        title: "Choose",
      })
    ).toEqual({ defaultPath: "/Users/me/Sites", title: "Choose" });
    expect(parsePickFolderRequest({})).toEqual({
      defaultPath: null,
      title: "Choose a folder",
    });
    expect(
      parsePickFolderRequest({ defaultPath: "relative/dir", title: "a\nb" })
    ).toEqual({ defaultPath: null, title: "a b" });
    expect(
      parsePickFolderRequest({ title: "x".repeat(500) })?.title
    ).toHaveLength(200);
    expect(
      parsePickFolderRequest({ defaultPath: "/a\0b" })?.defaultPath
    ).toBeNull();
  });

  it("refuses anything that is not a plain request", () => {
    expect(parsePickFolderRequest(null)).toBeNull();
    expect(parsePickFolderRequest("x")).toBeNull();
    expect(parsePickFolderRequest([])).toBeNull();
    expect(parsePickFolderRequest({ title: 7 })).toBeNull();
    expect(
      parsePickFolderRequest({ defaultPath: { toString: () => "/" } })
    ).toBeNull();
  });
});
