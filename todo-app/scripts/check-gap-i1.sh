#!/usr/bin/env bash
# Gap I-1 enforcement (TEA amendment m-1): service-layer code must consume
# ctx.ownerId, never ctx.principal.browserKey directly. See architecture.md §
# "Gap I-1: Request-context field naming bends the seam more than necessary".

set -euo pipefail

if [ ! -d app/services ]; then
  echo "OK: app/services/ does not exist yet (no callers to check)"
  exit 0
fi

if grep -rn 'ctx\.principal\.browserKey' app/services/; then
  echo ""
  echo "ERROR: ctx.principal.browserKey found in app/services/"
  echo "Service code must consume ctx.ownerId, never ctx.principal.browserKey directly."
  echo "See architecture.md § Gap I-1 for the rationale."
  exit 1
fi

echo "OK: no ctx.principal.browserKey references in app/services/"
