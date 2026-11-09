interface SpeedProbeImage {
  readonly bytes: number;
  readonly url: string;
}

interface SpeedVitals {
  readonly cls: number;
  readonly lcp: number | null;
  readonly tbt: number;
}

interface SpeedResources {
  readonly fonts: number;
  readonly images: readonly SpeedProbeImage[];
  readonly isDevServer: boolean;
  readonly transfer: number;
}

declare global {
  var speedSeen: PerformanceEntry[][];
}

const startSpeedWatch = (): boolean => {
  const types = [
    "paint",
    "largest-contentful-paint",
    "layout-shift",
    "longtask",
  ];

  const seen: PerformanceEntry[][] = [];

  for (const type of types) {
    const list: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((entries) => {
      list.push(...entries.getEntries());
    });

    observer.observe({ buffered: true, type });
    seen.push(list);
  }

  globalThis.speedSeen = seen;

  return true;
};

const inspectSpeedVitals = (): SpeedVitals => {
  const LONG_TASK_MS = 50;

  const [paints = [], largest = [], shifts = [], tasks = []] =
    globalThis.speedSeen;

  const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
  const fcpAt = fcp?.startTime ?? 0;
  let cls = 0;
  let tbt = 0;

  for (const entry of shifts) {
    const shift = entry as PerformanceEntry & {
      hadRecentInput: boolean;
      value: number;
    };

    if (!shift.hadRecentInput) {
      cls += shift.value;
    }
  }

  for (const entry of tasks) {
    if (entry.startTime >= fcpAt) {
      tbt += Math.max(0, entry.duration - LONG_TASK_MS);
    }
  }

  const lcp = largest.at(-1)?.startTime ?? null;

  return { cls, lcp, tbt };
};

const inspectSpeedResources = (): SpeedResources => {
  const MAX_IMAGES = 40;
  const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico)(?:[?#]|$)/iu;
  const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/iu;
  const DEV_FILE = /\/@vite\/client|webpack-hmr|hot-update|@react-refresh/u;

  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];

  const images: SpeedProbeImage[] = [];
  let transfer = 0;
  let fonts = 0;
  let isDevServer = false;

  for (const entry of entries) {
    const bytes = Math.max(entry.transferSize, entry.encodedBodySize);
    transfer += bytes;

    if (entry.initiatorType === "img" || IMAGE_FILE.test(entry.name)) {
      images.push({ bytes, url: entry.name });
    }

    if (FONT_FILE.test(entry.name)) {
      fonts += 1;
    }

    if (DEV_FILE.test(entry.name)) {
      isDevServer = true;
    }
  }

  images.sort((left, right) => right.bytes - left.bytes);
  images.splice(MAX_IMAGES);

  if (fonts === 0) {
    fonts = [...document.fonts].filter(
      (face) => face.status === "loaded"
    ).length;
  }

  return { fonts, images, isDevServer, transfer };
};

export { inspectSpeedResources, inspectSpeedVitals, startSpeedWatch };

export type { SpeedProbeImage, SpeedResources, SpeedVitals };
