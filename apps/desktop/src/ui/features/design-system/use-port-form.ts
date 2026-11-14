import { routes } from "@design-studio/actions/page/routes";
import { useMemo, useState } from "react";

import { useAction } from "../../platform/query.js";
import {
  toCleanRoute,
  toFirstFrameId,
  toPagePath,
  toRouteProblem,
  toRouteUpdate,
  toShownRoute,
  toSourceRoute,
} from "./port-model.js";
import type {
  PortFrameOption,
  PortRouteUpdate,
  PortTarget,
} from "./port-model.js";
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
  update: PortRouteUpdate | null;
}

interface SourceInput {
  directionId: string;
  file: string;
  projectId: string;
}

const toSourceInput = (
  projectId: string,
  directionId: string | null,
  file: string
): SourceInput | null => {
  if (directionId === null) {
    return null;
  }

  return { directionId, file, projectId };
};

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
  const [typedRoute, setTypedRoute] = useState<string | null>(null);
  const setRoute = setTypedRoute;

  const sourceInput = useMemo(
    () => toSourceInput(target.projectId, target.directionId, path),
    [path, target.directionId, target.projectId]
  );

  const source = useAction(routes.inspectSourcePage, sourceInput).data ?? null;
  const route = typedRoute ?? toSourceRoute(source, chosenApp);

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

  const update = toRouteUpdate(source, chosenApp, routeText, pages.picked);
  const badRoute = toRouteProblem(route, routeText, pages.picked, update);

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
    update,
  };
};

export { usePortForm };

export type { PortForm };
