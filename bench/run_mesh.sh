#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
# Benchmark one local GGUF through Mesh LLM (local-model-only, analytics off).
# Usage: bench/run_mesh.sh /abs/path/model.gguf results/<name>.json [max_tokens]
set -euo pipefail
GGUF="$1"; OUT="$2"; MAXTOK="${3:-600}"; TEMP="${4:-0}"
MESH="${MESH_LLM:-mesh-llm}"
HERE="$(cd "$(dirname "$0")" && pwd)"

"$MESH" analytics disable >/dev/null 2>&1 || true
"$MESH" serve --local-model-only --gguf "$GGUF" >"${TMPDIR:-/tmp}/mesh-bench.log" 2>&1 &
PID=$!
trap '"$MESH" stop >/dev/null 2>&1 || kill $PID 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do curl -sf localhost:9337/v1/models >/dev/null && break; sleep 2; done
MODEL=$(curl -s localhost:9337/v1/models | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"][0]["id"])')
echo "model id: $MODEL  sha256: $(shasum -a 256 "$GGUF" | cut -d" " -f1)" >&2

python3 "$HERE/run.py" --endpoint http://127.0.0.1:9337 --model "$MODEL" \
  --max-tokens "$MAXTOK" --temperature "$TEMP" --data "$HERE/data/sw_seed.jsonl" --out "$HERE/$OUT"
