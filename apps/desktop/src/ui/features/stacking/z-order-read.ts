import type {
  AnchorQuery,
  PreviewPort,
  SelectionContext,
  SelectionStack,
} from "./deps.js";

const READ_TIMEOUT_MS = 1500;
const ID_RADIX = 36;
const ID_START = 2;

const toLocText = (target: SelectionContext): string | null => {
  if (target.source === null) {
    return null;
  }

  return `${target.source.file}:${target.source.line}:${target.source.col}`;
};

const toQuery = (target: SelectionContext, id: string): AnchorQuery => ({
  id,
  selector: target.selector,
  sourceLoc: toLocText(target),
  tag: target.tag,
  textSnippet: "",
});

const readStack = async (
  port: PreviewPort | null,
  target: SelectionContext
): Promise<SelectionStack | null> => {
  const listen = port?.listen;

  if (!port || !listen) {
    return null;
  }

  const id = Math.random().toString(ID_RADIX).slice(ID_START);
  const { promise, resolve } = Promise.withResolvers<SelectionStack | null>();

  const stop = listen((message) => {
    if (message.type === "anchor-contexts" && message.requestId === id) {
      resolve(message.contexts[0]?.stack ?? null);
    }
  });

  const timer = globalThis.setTimeout(() => resolve(null), READ_TIMEOUT_MS);

  port.post({
    anchors: [toQuery(target, id)],
    hasStack: true,
    requestId: id,
    type: "describe-anchors",
  });

  const stack = await promise;
  stop();
  globalThis.clearTimeout(timer);

  return stack;
};

export { readStack };
