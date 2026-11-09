#!/usr/bin/env bash
set -Eeuo pipefail
export NODE_OPTIONS=--max-old-space-size=128
node node_modules/prisma/build/index.js migrate deploy
node --import tsx prisma/seed.ts
node --import tsx prisma/seed-advanced.ts
node scripts/bootstrap.free-preview.mjs
