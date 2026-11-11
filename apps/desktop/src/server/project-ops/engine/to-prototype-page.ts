const toEscapedText = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toPrototypePage = (title: string, appName: string): string => {
  const safeTitle = toEscapedText(title);
  const safeApp = toEscapedText(appName);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="stylesheet" href="tokens.css">
<style>
  main { max-width: 960px; margin: 0 auto; padding: 64px 24px; }
  h1 { margin: 0 0 12px; font-size: 32px; }
  p { margin: 0; color: var(--muted-foreground, inherit); }
</style>
</head>
<body>
<main>
  <h1>${safeTitle}</h1>
  <p>HTML prototype for ${safeApp}</p>
</main>
</body>
</html>
`;
};

export { toPrototypePage };
