import type http from "node:http";
import net from "node:net";
import type { Duplex } from "node:stream";

const toUpgradeHead = (req: http.IncomingMessage, upstream: URL): string => {
  const lines = [
    `${req.method ?? "GET"} ${req.url ?? "/"} HTTP/${req.httpVersion}`,
  ];

  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    const name = req.rawHeaders[index] ?? "";
    const value = req.rawHeaders[index + 1] ?? "";
    const lower = name.toLowerCase();

    if (lower === "host") {
      lines.push(`${name}: ${upstream.host}`);
    } else if (lower === "origin") {
      lines.push(`${name}: ${upstream.origin}`);
    } else {
      lines.push(`${name}: ${value}`);
    }
  }

  return `${lines.join("\r\n")}\r\n\r\n`;
};

const startUpgradePipe = (
  req: http.IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: string
): void => {
  const upstream = new URL(target);

  const connection = net.connect(
    Number(upstream.port),
    upstream.hostname,
    () => {
      connection.write(toUpgradeHead(req, upstream));

      if (head.length > 0) {
        connection.write(head);
      }

      socket.pipe(connection).pipe(socket);
    }
  );

  const close = (): void => {
    connection.destroy();
    socket.destroy();
  };

  connection.on("error", close);
  socket.on("error", close);
  connection.on("close", () => socket.destroy());
  socket.on("close", () => connection.destroy());
};

export { startUpgradePipe };
