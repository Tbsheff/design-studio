import { lazy } from "react";

const PublicationList = lazy(async () => {
  const loaded = await import("./publication-list.js");

  return { default: loaded.PublicationList };
});

export { PublicationList };
