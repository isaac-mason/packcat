#!/bin/bash
set -e

# cd to script directory
cd "$(dirname "$0")"

# cleanup
rm -rf ./dist

# build website
echo "Building Website..."
npm run build

echo "Build complete! Output in ./dist"
