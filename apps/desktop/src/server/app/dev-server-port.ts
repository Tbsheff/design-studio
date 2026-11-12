import { once } from "node:events";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const PROBE_TIMEOUT_MS = 3000;
const CLOSE_POLL_MS = 150;
const MAX_PORT = 65_535;

const toNoPortError = (start: number, last: number): Error =>
  new Error(
    `No free port from ${start} to ${last} for the app dev server. Set STUDIO_APP_PORT_BASE and STUDIO_APP_PORT_COUNT to pick another range.`
  );

const isPortFree = async (port: number): Promise<boolean> => {
  const probe = net.createServer();
  probe.unref();

  try {
    probe.listen(port, "127.0.0.1");
    await once(probe, "listening");
    await once(probe.close(), "close");

    return true;
  } catch {
    return false;
  }
};

const toFreePortFrom = async (
  port: number,
  start: number,
  last: number
): Promise<number> => {
  if (port > last) {
    throw toNoPortError(start, last);
  }

  if (await isPortFree(port)) {
    return port;
  }

  return toFreePortFrom(port + 1, start, last);
};

const toFreePort = (start: number, count: number): Promise<number> =>
  toFreePortFrom(start, start, Math.min(MAX_PORT, start + count - 1));

const canConnect = async (port: number): Promise<boolean> => {
  const socket = net.connect({ host: "127.0.0.1", port });

  try {
    await once(socket, "connect");

    return true;
  } catch {
    return false;
  } finally {
    socket.destroy();
  }
};

const toPause = async (ms: number): Promise<void> => {
  await delay(ms);
};

const isPortClosedBy = async (
  port: number,
  deadline: number
): Promise<boolean> => {
  if (!(await canConnect(port))) {
    return true;
  }

  if (Date.now() >= deadline) {
    return false;
  }

  await toPause(CLOSE_POLL_MS);

  return isPortClosedBy(port, deadline);
};

const isPortClosed = (port: number, timeoutMs: number): Promise<boolean> =>
  isPortClosedBy(port, Date.now() + timeoutMs);

const isAnswering = async (upstream: string): Promise<boolean> => {
  let isAnswered = false;

  try {
    const answer = await fetch(upstream, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    isAnswered = true;
    await answer.body?.cancel();
  } catch {
    return isAnswered;
  }

  return true;
};

export { canConnect, isAnswering, isPortClosed, toFreePort, toPause };
