import { findElement } from "../../platform/find-element.js";

const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]';

const hasOpenModal = (): boolean =>
  findElement(document.body, MODAL_SELECTOR) !== null;

export { hasOpenModal };
