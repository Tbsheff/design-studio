#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: scripts/make-icon.sh <icon.svg> [small.svg] [--out <dir>] [--install]" >&2
  echo "  icon.svg   1024x1024 source on the macOS icon grid" >&2
  echo "  small.svg  optional simpler source for the 16 and 32 px sizes" >&2
  echo "  --out      output dir (default: build/icon)" >&2
  echo "  --install  also copy icon.icns, icon.png and icon.svg into desktop/build-resources" >&2
  exit 2
}

src=""
small=""
out="build/icon"
install=0
while [[ -n "${1:-}" ]]; do
  case "$1" in
    --out) out="$2"; shift 2 ;;
    --install) install=1; shift ;;
    -h|--help) usage ;;
    *) if [[ -z "$src" ]]; then src="$1"; elif [[ -z "$small" ]]; then small="$1"; else usage; fi; shift ;;
  esac
done
[[ -n "$src" && -f "$src" ]] || usage
[[ -z "$small" || -f "$small" ]] || usage

chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ -x "$chrome" ]] || { echo "Chrome not found; set CHROME to a Chrome or Chromium binary" >&2; exit 1; }

root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

rasterize() {
  local svg="$1" png="$2"
  local abs
  abs="$(cd "$(dirname "$svg")" && pwd)/$(basename "$svg")"
  printf '<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:1024px;height:1024px}</style><img src="file://%s">' "$abs" > "$tmp/page.html"
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --default-background-color=00000000 --force-device-scale-factor=1 --window-size=1024,1024 \
    --user-data-dir="$tmp/profile" --screenshot="$png" "file://$tmp/page.html" >/dev/null 2>&1
  [[ -s "$png" ]] || { echo "failed to rasterize $svg" >&2; exit 1; }
}

master="$out/icon-1024.png"
rasterize "$src" "$master"
small_master="$master"
if [[ -n "$small" ]]; then
  small_master="$tmp/small-1024.png"
  rasterize "$small" "$small_master"
fi

resize() { sips -s format png -z "$2" "$2" "$1" --out "$3" >/dev/null; }

for size in 16 32 64 128 256 512; do
  from="$master"
  [[ $size -le 32 ]] && from="$small_master"
  resize "$from" "$size" "$out/icon-$size.png"
done

iconset="$tmp/icon.iconset"
mkdir -p "$iconset"
for size in 16 32 128 256 512; do
  double=$((size * 2))
  from="$master"; [[ $size -le 32 ]] && from="$small_master"
  resize "$from" "$size" "$iconset/icon_${size}x${size}.png"
  from2="$master"; [[ $double -le 32 ]] && from2="$small_master"
  if [[ $double -eq 1024 ]]; then cp "$master" "$iconset/icon_${size}x${size}@2x.png"; else resize "$from2" "$double" "$iconset/icon_${size}x${size}@2x.png"; fi
done
iconutil -c icns "$iconset" -o "$out/icon.icns"

cp "${small:-$src}" "$out/favicon.svg"
resize "$small_master" 32 "$out/favicon-32.png"
resize "$master" 180 "$out/apple-touch-icon.png"

if [[ $install -eq 1 ]]; then
  dest="$root/desktop/build-resources"
  cp "$out/icon.icns" "$dest/icon.icns"
  cp "$master" "$dest/icon.png"
  cp "$src" "$dest/icon.svg"
  echo "installed into $dest"
fi

echo "wrote $out: icon.icns, icon-{16..1024}.png, favicon.svg, favicon-32.png, apple-touch-icon.png"
