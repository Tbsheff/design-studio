import type { StudioEvent } from "../../shared/actions/_core/contracts.js";
import type {
  DesktopLinkMessage,
  DesktopRunInfo,
} from "../../shared/desktop-link.js";
import { DESKTOP_MESSAGE } from "../../shared/desktop-link.js";
import { RENDER_IPC_ENV } from "../../shared/render-rpc.js";
import type { EventBus } from "../events/index.js";

type Send = (message: DesktopLinkMessage) => void;

const desktopSender = (env: NodeJS.ProcessEnv = process.env): Send | null => {
  if (env[RENDER_IPC_ENV] !== "1" || !process.send) {
    return null;
  }

  return (message) => {
    if (process.connected) {
      process.send?.(message);
    }
  };
};

const runMessage = (
  event: StudioEvent,
  prompts: Map<string, string>
): DesktopLinkMessage | null => {
  if (event.type === "mcp.approval") {
    return {
      approvalId: event.approval.id,
      kind: "mcp-approval",
      projectId: event.projectId,
      title: event.approval.title,
      type: DESKTOP_MESSAGE,
    };
  }

  if (event.type !== "run.started" && event.type !== "run.finished") {
    return null;
  }

  const directionId = event.directionId ?? "";

  if (event.type === "run.started") {
    prompts.set(event.runId, event.request.prompt);

    return {
      kind: "run-started",
      run: {
        directionId,
        projectId: event.projectId,
        prompt: event.request.prompt,
        runId: event.runId,
      },
      type: DESKTOP_MESSAGE,
    };
  }

  const { summary } = event;

  const finished: DesktopRunInfo = {
    directionId: summary.directionId,
    projectId: summary.projectId,
    prompt: summary.request.prompt || prompts.get(summary.id) || "",
    runId: summary.id,
  };

  prompts.delete(summary.id);

  return {
    costUsd: summary.costUsd,
    error: summary.error,
    kind: "run-finished",
    run: finished,
    status: summary.status,
    type: DESKTOP_MESSAGE,
  };
};

const linkDesktop = (
  bus: EventBus,
  send: Send,
  hello: { token: string; dataDir: string }
): EventBus => {
  const prompts = new Map<string, string>();

  send({ kind: "hello", type: DESKTOP_MESSAGE, ...hello });

  return {
    ...bus,
    emit(input) {
      const event = bus.emit(input);
      const message = runMessage(event, prompts);

      if (message) {
        send(message);
      }

      return event;
    },
  };
};

export { desktopSender, linkDesktop };
