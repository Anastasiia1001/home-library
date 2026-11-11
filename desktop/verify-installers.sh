#!/bin/bash
set -euo pipefail
root=$(pwd)
verify_app() {
  local bundle="$1"
  test -d "$bundle/Contents/Resources"
  test -s "$bundle/Contents/Resources/app.asar"
  test -s "$bundle/Contents/_CodeSignature/CodeResources"
  /usr/bin/codesign --verify --deep --strict --verbose=2 "$bundle"
  echo "PASS: complete resources and signature: $bundle"
}
for image in "$root"/release/*.dmg; do
  scratch=$(mktemp -d)
  mkdir "$scratch/mount" "$scratch/Applications"
  cleanup() { /usr/bin/hdiutil detach "$scratch/mount" -quiet || true; rm -rf "$scratch"; }
  trap cleanup EXIT
  /usr/bin/hdiutil verify "$image"
  /usr/bin/hdiutil attach "$image" -mountpoint "$scratch/mount" -nobrowse -readonly -quiet
  source_app="$scratch/mount/Домашня бібліотека.app"
  verify_app "$source_app"
  copied="$scratch/Applications/Домашня бібліотека.app"
  /usr/bin/ditto "$source_app" "$copied"
  verify_app "$copied"
  if [[ "$image" == *arm64.dmg ]]; then
    "$copied/Contents/MacOS/Домашня бібліотека" --smoke-test
  fi
  cleanup
  trap - EXIT
  echo "PASS: disk image and installed copy: $image"
done
for archive in "$root"/release/*.zip; do
  scratch=$(mktemp -d)
  /usr/bin/ditto -x -k "$archive" "$scratch"
  verify_app "$scratch/Домашня бібліотека.app"
  rm -rf "$scratch"
  echo "PASS: extracted ZIP: $archive"
done
(cd release && shasum -a 256 ./*.dmg ./*.zip > SHA256SUMS.txt)
