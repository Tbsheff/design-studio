import type { Direction, Project } from "@design-studio/contracts";
import type { PortFlowPlan, PortPlan } from "@design-studio/contracts/port";
import { PORT_LEVEL_LABEL } from "@design-studio/contracts/port";

import type { PortAssetCopy } from "./port-assets.js";
import { toAssetsTag } from "./port-assets.js";
import type { FlowRouteBlock } from "./port-flow-update.js";
import type { PortLookPage } from "./port-look.js";
import { portFlowText, portPlanText } from "./port-plan.js";
import type { PortPlanInput } from "./port-plan.js";

interface StartableTarget {
  readonly direction: Direction;
  readonly project: Project;
  readonly route: string;
}

type StartableInput = PortPlanInput & { readonly target: StartableTarget };

interface FlowPromptUpdate {
  readonly assets: PortAssetCopy;
  readonly blocks: readonly FlowRouteBlock[];
  readonly lead: string;
}

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

const toFlowHead = (
  input: StartableInput,
  flow: PortFlowPlan,
  blocks: readonly FlowRouteBlock[]
): string => {
  const updated = new Set(blocks.map((block) => block.path));
  const count = flow.pages.length;

  const fresh = flow.pages.flatMap((page) => {
    if (updated.has(page.path)) {
      return [];
    }

    return [`\`${page.routeFile ?? page.route}\``];
  });

  const kept = blocks.map((block) => `\`${block.file}\``).join(", ");

  const parts = [
    `${PORT_LEVEL_LABEL}: move the ${count} prototype pages of a flow from the project "${input.source.project.name}" into this app as ${count} routes under ${flow.base}.`,
  ];

  if (blocks.length > 0) {
    parts.push(`Update these existing route files in place: ${kept}.`);
  }

  if (fresh.length > 0) {
    parts.push(`Write these new route files: ${fresh.join(", ")}.`);
  }

  return parts.join(" ");
};

const toFlowPrompt = (
  input: StartableInput,
  flow: PortFlowPlan,
  sources: readonly PortLookPage[],
  update: FlowPromptUpdate
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
      ...update.blocks.flatMap((block) => {
        if (block.path !== page.path) {
          return [];
        }

        return [block.text];
      }),
      toTagged(
        "prototype-source",
        attribute,
        toCutSource(sources[index]?.html ?? "", max)
      ),
    ].join("\n\n");
  });

  return [
    toFlowHead(input, flow, update.blocks),
    toTagged("port-flow", "", portFlowText(flow)),
    update.lead,
    toAssetsTag(update.assets),
    ...pages,
    toCheckLine(
      input,
      flow.pages[0]?.path ?? input.source.path,
      flow.pages[0]?.route ?? input.target.route
    ),
  ]
    .filter((part) => part !== "")
    .join("\n\n");
};

export { toFlowPrompt, toPagePrompt };

export type { StartableInput, StartableTarget };
