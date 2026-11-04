const fs = require("node:fs");
const path = require("node:path");

const TS_EXTENSIONS = [".ts", ".tsx", ".d.ts", ".cts", ".mts"];
const JS_TO_TS = { ".js": [".ts", ".tsx"], ".jsx": [".tsx"], ".cjs": [".cts"], ".mjs": [".mts"] };

const isFile = (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile();

const candidatesOf = (base) => {
  const ext = path.extname(base);
  const swapped = (JS_TO_TS[ext] ?? []).map((tsExt) => base.slice(0, -ext.length) + tsExt);
  const added = TS_EXTENSIONS.map((tsExt) => base + tsExt);
  const indexes = TS_EXTENSIONS.map((tsExt) => path.join(base, `index${tsExt}`));
  return [base, ...swapped, ...added, ...indexes];
};

const resolveRelative = (source, file) => {
  const base = path.resolve(path.dirname(file), source);
  const found = candidatesOf(base).find(isFile);
  return found ? { found: true, path: found } : { found: false };
};

const resolveBare = (source, file) => {
  try {
    return { found: true, path: require.resolve(source, { paths: [path.dirname(file)] }) };
  } catch {
    return { found: false };
  }
};

module.exports = {
  interfaceVersion: 2,
  resolve: (source, file) => (source.startsWith(".") || path.isAbsolute(source) ? resolveRelative(source, file) : resolveBare(source, file)),
};
