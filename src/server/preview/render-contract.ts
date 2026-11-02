import type {
  RenderBackendName,
  RenderClip,
  RenderErrors,
} from "../../shared/render-rpc.js";
import type { AxeViolation } from "./axe.js";

interface RenderPage {
  goto: (url: string) => Promise<void>;
  evaluate: <Result>(expression: string) => Promise<Result>;
  screenshot: (outPath: string, clip?: RenderClip) => Promise<void>;
  errors: () => Promise<RenderErrors>;
  close: () => Promise<void>;
  lastNav?: () => { loadMs: number; idleMs: number } | null;
  reset?: () => Promise<void>;
  axe?: () => Promise<AxeViolation[]>;
}

interface RenderViewport {
  width: number;
  height: number;
  scale?: number;
}

interface RenderBackend {
  readonly name: RenderBackendName;
  readonly reusablePages?: boolean;
  open: (viewport: RenderViewport) => Promise<RenderPage>;
  close: () => Promise<void>;
  warm?: () => Promise<void>;
}

const NAVIGATION_TIMEOUT_MS = 30_000;
const SETTLE_TIMEOUT_MS = 5000;

export type { RenderBackend, RenderPage, RenderViewport };

export { NAVIGATION_TIMEOUT_MS, SETTLE_TIMEOUT_MS };
