#!/bin/bash
root_dir=$(pwd)
set -e

echo "Node and Npm Version:"
node -v
npm -v

for folder in */; do
  if [ -f "$folder/package.json" ]; then
    echo "package.json exists in $folder"
    echo "Running npm install in $folder"
    cd "$folder"
    npm install --save --save-exact --legacy-peer-deps
    cd "$root_dir"
  fi
done

find layers/ ! -path "*/node_modules/*" -name "package.json" -exec sh -c 'cd "$(dirname "{}")" && npm install' \;

echo "Npm install completed"
