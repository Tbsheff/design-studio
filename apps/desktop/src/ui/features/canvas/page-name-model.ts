const pageName = (path: string | undefined): string => {
  const clean = (path ?? "").replace(/^\/+/u, "").replace(/\.html$/u, "");

  return clean || "index";
};

const pageLabel = (page: string, routes: boolean): string => {
  if (routes) {
    return `/${page}`;
  }

  return page;
};

const isCurrentPage = (
  page: string,
  path: string,
  routes: boolean
): boolean => {
  if (routes) {
    return page === path;
  }

  return page === (path || "index.html");
};

const toPagePlaceholder = (routes: boolean, hasList: boolean): string => {
  if (routes) {
    return "settings";
  }

  if (hasList) {
    return "about.html";
  }

  return "pricing";
};

const toPageHint = (routes: boolean): string => {
  if (routes) {
    return "Use a route inside the app, like /settings. No “..”.";
  }

  return "Use a path inside the project, like about.html. No “..”.";
};

export { isCurrentPage, pageLabel, pageName, toPageHint, toPagePlaceholder };
