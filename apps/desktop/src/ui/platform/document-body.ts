import { useSyncExternalStore } from "react";

const stopNothing = (): boolean => false;

const subscribeNothing = (): (() => void) => stopNothing;

const readBody = (): HTMLElement => document.body;

const readNoBody = (): HTMLElement | null => null;

const useDocumentBody = (): HTMLElement | null =>
  useSyncExternalStore(subscribeNothing, readBody, readNoBody);

export { useDocumentBody };
