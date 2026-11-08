const ASK_CHAT_EVENT = "studio:ask-chat";

const requestAskChat = (): void => {
  globalThis.dispatchEvent(new Event(ASK_CHAT_EVENT));
};

export { ASK_CHAT_EVENT, requestAskChat };
