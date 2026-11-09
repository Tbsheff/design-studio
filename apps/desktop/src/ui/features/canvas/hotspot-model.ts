import type { LinkRectReport } from "@design-studio/contracts/links";

type Rect = NonNullable<LinkRectReport["rect"]>;

interface HotspotFlash {
  readonly count: number;
  readonly token: string;
}

const HOTSPOT_KEY_PREFIX = "design-studio.play-hotspots.";
const HOTSPOT_OFF = "off";
const FLASH_MS = 600;

const toHotspotKey = (projectId: string): string =>
  `${HOTSPOT_KEY_PREFIX}${projectId}`;

const toStoredHints = (raw: string | null): boolean => raw !== HOTSPOT_OFF;

const toHotspotRects = (links: readonly LinkRectReport[]): Rect[] => {
  const rects: Rect[] = [];

  for (const link of links) {
    if (link.rect && link.rect.width > 0 && link.rect.height > 0) {
      rects.push(link.rect);
    }
  }

  return rects;
};

export { FLASH_MS, HOTSPOT_OFF, toHotspotKey, toHotspotRects, toStoredHints };

export type { HotspotFlash, Rect };
