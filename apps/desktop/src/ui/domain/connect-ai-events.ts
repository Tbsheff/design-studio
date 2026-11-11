const CONNECT_AI_EVENT = "studio:connect-ai";

const CONNECT_AI_COMMAND = "view.connect-ai";

const openConnectAi = (): void => {
  globalThis.dispatchEvent(new CustomEvent(CONNECT_AI_EVENT));
};

export { CONNECT_AI_COMMAND, CONNECT_AI_EVENT, openConnectAi };
