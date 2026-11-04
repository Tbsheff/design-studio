import { AllActions } from "@design-studio/actions";
import type { AnyAction } from "@design-studio/actions/_core/action";

const DIRECTION_PATH = "/d/:directionId/";

const toPathPattern = (path: string): RegExp => {
  const source = path
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        return "[^/]+";
      }

      return part.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
    })
    .join("/");

  return new RegExp(`^${source}$`, "u");
};

const isHeldAction = (action: AnyAction): boolean =>
  action.access !== "read" &&
  action.scope === "project" &&
  action.http.path.includes(DIRECTION_PATH);

const toHeldPatterns = (): readonly RegExp[] => {
  const patterns: RegExp[] = [];

  for (const group of Object.values(AllActions)) {
    for (const action of Object.values(group) as AnyAction[]) {
      if (isHeldAction(action)) {
        patterns.push(toPathPattern(action.http.path));
      }
    }
  }

  return patterns;
};

const HELD_PATTERNS = toHeldPatterns();

const isHeldActionPath = (path: string): boolean =>
  HELD_PATTERNS.some((pattern) => pattern.test(path));

export { isHeldActionPath };
