import type { Direction, Project } from "@design-studio/contracts";
import type { PortFlowPlan, PortPlan } from "@design-studio/contracts/port";
import { PORT_LEVEL_LABEL } from "@design-studio/contracts/port";

import type { PortAssetCopy } from "./port-assets.js";
import { toAssetsTag } from "./port-assets.js";
import type { PortLookPage } from "./port-look.js";
import { portFlowText, portPlanText } from "./port-plan.js";
import type { PortPlanInput } from "./port-plan.js";

interface StartableTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly route: string;
}

type StartableInput = PortPlanInput & { readonly target: StartableTarget };

const SOURCE_TEXT_MAX = 24_000;

const FLOW_SOURCE_MAX = 64_000;

const toTagged = (tag: string, attributes: string, body: string): string =>
  ["<", tag, attributes, ">\n", body, "\n</", tag, ">"].join("");

const toPathAttribute = (path: string): string =>
  [' path="', path, '"'].join("");

const toCutSource = (html: string, max: number): string => {
  if (html.length <= max) {
    return html;
  }

  return `${html.slice(0, max)}\n<!-- source cut at ${max} characters -->`;
};

const toCheckAttribute = (key: string, value: string): string =>
  [" ", key, '="', value, '"'].join("");

const toCheckLine = (
  input: StartableInput,
  path: string,
  route: string
): string =>
  [
    [
      "<",
      "port-check",
      toCheckAttribute("projectId", input.source.project.id),
      toCheckAttribute("directionId", input.source.direction.id),
      toCheckAttribute("path", path),
      toCheckAttribute("targetProjectId", input.target.project.id),
      toCheckAttribute("routePath", route),
      " />",
    ].join(""),
    "Before you report done, call inspect_port with these five values. If the score or an area is under 80, fix those areas and call inspect_port once more.",
  ].join("\n");

const toPagePrompt = (
  input: StartableInput,
  plan: PortPlan,
  page: PortLookPage,
  assets: PortAssetCopy
): string => {
  const { html, look } = page;
  const routeFile = plan.target?.routeFile ?? null;
  let file = "";

  if (routeFile) {
    file = ` (file \`${routeFile}\`)`;
  }

  return [
    `${PORT_LEVEL_LABEL}: move the prototype page ${plan.source.path} from the project "${input.source.project.name}" into this app as the route ${input.target.route}${file}.`,
    toTagged("port-plan", "", portPlanText(plan, look)),
    toAssetsTag(assets),
    toTagged(
      "prototype-source",
      toPathAttribute(plan.source.path),
      toCutSource(html, SOURCE_TEXT_MAX)
    ),
    toCheckLine(input, plan.source.path, input.target.route),
  ].join("\n\n");
};

const toFlowPrompt = (
  input: StartableInput,
  flow: PortFlowPlan,
  sources: readonly PortLookPage[],
  assets: PortAssetCopy
): string => {
  const max = Math.min(
    SOURCE_TEXT_MAX,
    Math.floor(FLOW_SOURCE_MAX / Math.max(1, flow.pages.length))
  );

  const pages = flow.pages.map((page, index) => {
    const attribute = toPathAttribute(page.path);

    return [
      toTagged(
        "port-plan",
        attribute,
        portPlanText(page.plan, sources[index]?.look ?? null)
      ),
      toTagged(
        "prototype-source",
        attribute,
        toCutSource(sources[index]?.html ?? "", max)
      ),
    ].join("\n\n");
  });

  const files = flow.pages
    .map((page) => `\`${page.routeFile ?? page.route}\``)
    .join(", ");

  return [
    `${PORT_LEVEL_LABEL}: move the ${flow.pages.length} prototype pages of a flow from the project "${input.source.project.name}" into this app as ${flow.pages.length} routes under ${flow.base}. Write these route files: ${files}.`,
    toTagged("port-flow", "", portFlowText(flow)),
    toAssetsTag(assets),
    ...pages,
    toCheckLine(
      input,
      flow.pages[0]?.path ?? input.source.path,
      flow.pages[0]?.route ?? input.target.route
    ),
  ].join("\n\n");
};

export { toFlowPrompt, toPagePrompt };

export type { StartableInput, StartableTarget };
