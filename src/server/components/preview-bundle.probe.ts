import type {
  BundleRequest,
  GalleryBundleRequest,
  SampleNode,
} from "./preview-bundle.js";

const nodeSource = (node: SampleNode | string): string => {
  if (!(node instanceof Object)) {
    return JSON.stringify(node);
  }

  const children = node.children.map(nodeSource).join(", ");
  let tail = "";

  if (children !== "") {
    tail = `, ${children}`;
  }

  return `React.createElement(part(${JSON.stringify(node.exportName)}), ${JSON.stringify(node.props)}${tail})`;
};

const entrySource = (request: BundleRequest): string =>
  `import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as Module from ${JSON.stringify(request.file)};
function part(name) {
  const value = Module[name];
  if (typeof value === 'function' || (typeof value === 'object' && value !== null)) return value;
  throw new Error('The file does not export ' + name + ' as a component');
}
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { window.__studioPreviewError = String((error && error.message) || error); }
  render() { return this.state.failed ? null : this.props.children; }
}
const root = createRoot(document.getElementById('studio-preview'));
window.__studioPreviewUnmount = () => root.unmount();
try {
  root.render(React.createElement(Boundary, null, ${nodeSource(request.tree)}));
} catch (error) {
  window.__studioPreviewError = String((error && error.message) || error);
}
`;

const galleryEntrySource = (request: GalleryBundleRequest): string => {
  const cells = request.cells
    .map(
      (cell) => `[${JSON.stringify(cell.id)}, () => ${nodeSource(cell.tree)}]`
    )
    .join(",\n");

  return `import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as Module from ${JSON.stringify(request.file)};
function part(name) {
  const value = Module[name];
  if (typeof value === 'function' || (typeof value === 'object' && value !== null)) return value;
  throw new Error('The file does not export ' + name + ' as a component');
}
window.__studioGalleryErrors = window.__studioGalleryErrors || {};
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { window.__studioGalleryErrors[this.props.cell] = String((error && error.message) || error); }
  render() { return this.state.failed ? null : this.props.children; }
}
for (const [id, make] of [${cells}]) {
  const host = document.getElementById('gc-' + id);
  if (!host) continue;
  try {
    createRoot(host).render(React.createElement(Boundary, { cell: id }, make()));
  } catch (error) {
    window.__studioGalleryErrors[id] = String((error && error.message) || error);
  }
}
`;
};

export { entrySource, galleryEntrySource };
