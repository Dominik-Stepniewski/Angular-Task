#!/usr/bin/env bash
#
# Start the whole stack for local development — all three services:
#
#   • service-a + service-b + infra (mongo / redis / nats) via docker compose.
#     The services run inside their images on purpose: service-b's PDF report
#     uses chartjs-node-canvas, whose native `canvas` binding is only built in
#     the image, so `nx serve service-b` on the host would crash at boot.
#   • the Angular frontend via `nx serve` on the host (fast HMR / rebuilds).
#
# URLs:
#   service-a  http://localhost:3001/docs
#   service-b  http://localhost:3002/docs
#   frontend   http://localhost:4200
#
# Usage:
#   scripts/start-all.sh          # start; leaves infra + services up on exit
#   scripts/start-all.sh --down   # also `docker compose stop` on Ctrl-C
#
set -euo pipefail

# Run from the workspace root regardless of where the script is invoked.
cd "$(dirname "$0")/.."

STOP_ON_EXIT=0
[[ "${1:-}" == "--down" ]] && STOP_ON_EXIT=1

echo "▶ bringing up infra + service-a + service-b (docker compose)…"
docker compose up -d --build --wait

echo
echo "  service-a  http://localhost:3001/docs"
echo "  service-b  http://localhost:3002/docs"
echo "  frontend   http://localhost:4200  (starting — Ctrl-C to stop)"
echo

if [[ "$STOP_ON_EXIT" == "1" ]]; then
  # Stop the compose app containers when the frontend serve is interrupted.
  trap 'echo; echo "▶ stopping compose stack…"; docker compose stop' EXIT
fi

# Foreground: holds the terminal, streams logs, Ctrl-C stops it (and, with
# --down, triggers the trap above). Infra is otherwise left running for fast
# subsequent starts.
exec pnpm exec nx serve frontend
