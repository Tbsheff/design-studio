import { timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { promisify } from "node:util";

const LOOPBACK = "127.0.0.1";

const isSameText = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);

  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

const isAddressInfo = (
  address: AddressInfo | string | null
): address is AddressInfo => address !== null && address !== String(address);

const stopProbe = (probe: net.Server): Promise<void> =>
  promisify(probe.close.bind(probe))();

const startProbe = async (options: net.ListenOptions): Promise<net.Server> => {
  const probe = net.createServer();

  probe.unref();
  probe.listen(options);
  await once(probe, "listening");

  return probe;
};

const isPortFree = async (port: number): Promise<boolean> => {
  try {
    const probe = await startProbe({ exclusive: true, host: LOOPBACK, port });

    await stopProbe(probe);

    return true;
  } catch {
    return false;
  }
};

const getFreePort = async (): Promise<number> => {
  const probe = await startProbe({ host: LOOPBACK, port: 0 });
  const address = probe.address();

  await stopProbe(probe);

  if (!isAddressInfo(address)) {
    throw new Error("The MCP port probe found no free port.");
  }

  return address.port;
};

export { getFreePort, isPortFree, isSameText };
