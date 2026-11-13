import { useState } from "react";

import {
  toCleanRoute,
  toFirstFrameId,
  toPagePath,
  toRouteProblem,
  toShownRoute,
} from "./port-model.js";
import type { PortTarget, PortFrameOption } from "./port-model.js";
import { usePagePicks } from "./use-page-picks.js";
import type { PagePicks } from "./use-page-picks.js";
import { usePlan } from "./use-port-plan.js";
import type { FlowState } from "./use-port-plan.js";
import { useTargets } from "./use-port-targets.js";
import type { Targets } from "./use-port-targets.js";

interface PortForm {
  badRoute: string | null;
  chosenApp: string;
  cleanRoute: string | null;
  frameId: string;
  frames: PortFrameOption[];
  htmlSource: boolean;
  isReady: boolean;
  pages: PagePicks;
  path: string;
  plan: FlowState;
  routeText: string;
  setAppId: (id: string) => void;
  setFrameId: (id: string) => void;
  setRoute: (route: string | null) => void;
  targets: Targets;
}

const toIsReady = (
  form: Pick<PortForm, "chosenApp" | "cleanRoute" | "htmlSource" | "pages">,
  badRoute: string | null,
  plan: FlowState
): boolean => {
  if (!form.chosenApp || !form.cleanRoute || badRoute) {
    return false;
  }

  if (plan.loading || plan.error) {
    return false;
  }

  return form.pages.picked.length > 0 && form.htmlSource;
};

const toDefaultApp = (targets: Targets): string => {
  const linked = targets.linkedApp;

  if (targets.apps?.some((app) => app.id === linked)) {
    return linked ?? "";
  }

  return targets.apps?.[0]?.id ?? "";
};

const usePortForm = (
  target: PortTarget,
  frames: PortFrameOption[]
): PortForm => {
  const [frameId, setFrameId] = useState(() =>
    toFirstFrameId(frames, target.frameId)
  );

  const current = frames.find((frame) => frame.id === frameId) ?? frames[0];
  const path = toPagePath(current?.path ?? null);
  const targets = useTargets(target.projectId);
  const [appId, setAppId] = useState("");
  const chosenApp = appId || toDefaultApp(targets);
  const [route, setRoute] = useState<string | null>(null);

  const plan = usePlan({
    path,
    route: toCleanRoute(route),
    sourceDirectionId: target.directionId,
    sourceProjectId: target.projectId,
    targetProjectId: chosenApp,
  });

  const routeText = toShownRoute(route, plan.flow, path);
  const cleanRoute = toCleanRoute(routeText);
  const pages = usePagePicks(plan.flow);

  const htmlSource =
    !targets.source || (targets.source.kind === "html" && !targets.source.app);

  const badRoute = toRouteProblem(route, routeText, pages.picked);

  const isReady = toIsReady(
    { chosenApp, cleanRoute, htmlSource, pages },
    badRoute,
    plan
  );

  return {
    badRoute,
    chosenApp,
    cleanRoute,
    frameId,
    frames,
    htmlSource,
    isReady,
    pages,
    path,
    plan,
    routeText,
    setAppId,
    setFrameId,
    setRoute,
    targets,
  };
};

export { usePortForm };

export type { PortForm };
