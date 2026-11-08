import { lazy } from "react";

const menusChunk = import("./project-card-menus.js");

const CardMenu = lazy(async () => {
  const loaded = await menusChunk;

  return { default: loaded.CardMenu };
});

const RenameField = lazy(async () => {
  const loaded = await menusChunk;

  return { default: loaded.RenameField };
});

export { CardMenu, RenameField };
