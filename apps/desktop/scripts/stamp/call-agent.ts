import path from "node:path";
import { pathToFileURL } from "node:url";

import { WORKSPACE_ROOT } from "../workspace-root.ts";
import { firstText, parseText, timed, TOKEN_HEADER } from "./call-types.js";
import type { Context, SurfaceResult, TextResult } from "./call-types.js";

const ROOT = WORKSPACE_ROOT;

const NOT_FOUND = 404;

const AGENT_TOOL_ROUTE = "/api/agent-tools/";

const NO_ROUTE =
  "the studio has no agent tool route. Start it with STUDIO_AGENT=mock, then run call-action again";

const importSource = async <Module>(relative: string): Promise<Module> => {
  const loaded = (await import(
    pathToFileURL(path.join(ROOT, relative)).href
  )) as Module;

  return loaded;
};

const runAgentTool = async (
  context: Context,
  name: string
): Promise<TextResult> => {
  const res = await fetch(
    `${context.base}${AGENT_TOOL_ROUTE}${encodeURIComponent(name)}`,
    {
      body: JSON.stringify({ args: context.input }),
      headers: new Headers([
        ["content-type", "application/json"],
        [TOKEN_HEADER, context.token],
      ]),
      method: "POST",
    }
  );

  if (res.status === NOT_FOUND) {
    throw new Error(NO_ROUTE);
  }

  if (!res.ok) {
    throw new Error(
      `the agent tool route answered ${res.status}: ${await res.text()}`
    );
  }

  const reply = (await res.json()) as TextResult;

  return reply;
};

const callAgent = async (context: Context): Promise<SurfaceResult> => {
  const { name, off } = context.action.agent;

  if (!name) {
    return { reason: `agent binding is off (${off})`, surface: "agent" };
  }

  const timing = await timed(() => runAgentTool(context, name));

  return {
    isError: timing.value.isError === true,
    ms: timing.ms,
    output: parseText(firstText(timing.value)),
    spawns: null,
    surface: "agent",
  };
};

export { callAgent, importSource };
