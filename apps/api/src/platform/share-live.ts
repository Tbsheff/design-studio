import { DurableObject } from "cloudflare:workers";

import { GONE } from "../shared-actions.js";

const REVOKED_KEY = "revoked";

const encoder = new TextEncoder();

const toFrame = (event: string, data: string): Uint8Array =>
  encoder.encode(`event: ${event}\ndata: ${data}\n\n`);

class ShareLive extends DurableObject {
  private readonly streams = new Set<ReadableStreamDefaultController>();

  public override async fetch(): Promise<Response> {
    const isRevoked =
      (await this.ctx.storage.get<boolean>(REVOKED_KEY)) === true;

    if (isRevoked) {
      return new Response("This share link is not active.", {
        status: GONE,
      });
    }

    let opened: ReadableStreamDefaultController | null = null;

    const body = new ReadableStream({
      cancel: (): void => {
        if (opened !== null) {
          this.streams.delete(opened);
        }
      },
      start: (controller): void => {
        opened = controller;
        this.streams.add(controller);
        controller.enqueue(toFrame("ready", "{}"));
      },
    });

    return new Response(body, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/event-stream",
      },
    });
  }

  public async revoke(): Promise<number> {
    await this.ctx.storage.put(REVOKED_KEY, true);
    const closed = this.streams.size;

    for (const stream of this.streams) {
      stream.enqueue(toFrame("revoked", "{}"));
      stream.close();
    }

    this.streams.clear();

    return closed;
  }
}

export { ShareLive };
