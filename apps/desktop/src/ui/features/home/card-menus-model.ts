import { lazy } from "react";

const menuChunk = import("./card-menu.js");

const renameChunk = import("./rename-field.js");

const CardMenu = lazy(async () => {
  const loaded = await menuChunk;

  return { default: loaded.CardMenu };
});

const RenameField = lazy(async () => {
  const loaded = await renameChunk;

  return { default: loaded.RenameField };
});

export { CardMenu, RenameField };
