const RULE_LINES = [
  "The route file exists in the app. Update it in place. Do not make a new route.",
  "Keep every data read: server component await calls, tRPC or fetch calls, params and searchParams use, loaders.",
  "Keep the exports Next needs: default, generateMetadata, dynamic, revalidate. Keep the imports that the kept code uses.",
  "Replace the markup and the classes with the prototype design. Map them to the app tokens and kit as the port plan says.",
  "Also restyle the components that the route imports from its own folder. Keep their data reads (hooks, queries) and exports.",
  "Bind the design to the route's own data. The prototype rows are sample data: do not write a sample row into the app.",
  "Change the route files only with the Edit or Write tool. Do not change them with Bash: sed -i fails on macOS.",
  "First, before any other route write, call the tool mcp__studio__apply_port with only routePath (load it with ToolSearch). It writes the measured prototype values (spacing, size, gap) into the route files. Then make the other changes with Edit.",
];

export { RULE_LINES };
