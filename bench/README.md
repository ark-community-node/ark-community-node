# Open Swahili benchmark (pre-release)

Goal: a public, reproducible test of whether small open models actually help people in East
African languages with everyday tasks: farming, health information, school, money and letters.

> ⚠️ **The seed items in `data/sw_seed.jsonl` are DRAFTS.** They were written by the maintainers
> and have **not yet been reviewed by native speakers**. Do not publish scores from them. Each item
> counts only once `reviewed_by` is filled in.

## Item format (JSONL)
```json
{"id":"sw-agri-001","lang":"sw","domain":"agriculture","prompt":"...","must_include_any":["..."],"reviewed_by":null}
```
`must_include_any` is a cheap automatic check: does the answer mention at least one key idea?
It's a floor, not a quality score. Native-speaker grading (1–5 for correctness, fluency and
usefulness) is the real measure and will be added in v0.1.

## Run
```sh
python3 run.py --endpoint http://127.0.0.1:8080 --model my-model --data data/sw_seed.jsonl --out results/my-model.json
```
Results record the model name, endpoint, timestamp, per-item latency and pass/fail. Commit them along with the model's SHA-256.

## First result (25 Nov 2026, smoke test)
Qwen3.5-0.8B (Q4_K_M) on QVAC/llama.cpp: **0 of 10 Swahili prompts produced an answer** within
1,500 tokens. The model loops in its hidden reasoning, for example translating *wiki* (week) as
"books" and repeating itself. The same model answers simple English arithmetic correctly.
Raw output: `results/2026-11-25_qwen3.5-0.8b_smoke.json`. This is why the benchmark exists:
tiny open models that look fine in English can fail completely in Swahili, and nobody publishes that.

## Second result (25 Nov 2026): same model on Mesh LLM
On **Mesh LLM v0.80.0** (Spiral's open runtime), the model's reasoning mode is switched off, so it
answers **10/10 prompts** (up from 0/10 on QVAC). But reading the answers shows they are **not
usable Swahili**: every one falls into a repetition loop ("mpya wa mpya wa mpya…") or echoes the
question. A naive keyword check scored this run **40%**. With repetition and echo detection added
(and checked against fluent Swahili controls that pass), the floor score is **0%**.

**Lesson for anyone benchmarking African languages:** keyword checks badly overstate quality.
Automatic checks need degeneracy detection, and the real score has to come from native speakers.

## Comparison (25 Nov 2026): three small open models on Mesh LLM, same 10 draft prompts

| Model | Size (Q4_K_M) | Keyword floor check | Maintainer read: fully correct | Typical answer time (M-series Mac) |
|---|---|---|---|---|
| **MORENA 1.5B** (Vambo AI, Apache-2.0) | 0.9 GB | 80% | **4 / 10** | 1–5 s |
| Gemma 3 1B | 0.8 GB | 10% | 0 / 10 | 3–20 s |
| Qwen3.5 0.8B | 0.5 GB | 0% | 0 / 10 | 7–32 s |

**What we learned:**
- **MORENA writes fluent, on-topic Swahili.** No loops, no wrong language. That clearly sets it apart.
- **Fluent isn't the same as correct.** MORENA got both money sums wrong (chama total: 8,000 or 72,000
  instead of 24,000), named the wrong pest for maize damage, and once answered as the employer
  instead of writing a job application. A keyword check says 80%. A careful read says 4/10 fully correct.
- **Gemma 3 1B drifts into Indonesian and Tagalog** on Swahili prompts. The detector now flags wrong-language answers too.
- **Runtime note:** on Mesh LLM v0.80.0, Gemma 3 1B returned HTTP 502 (`llama_decode failed rc=-3`)
  whenever `temperature: 0` was sent, and the error persisted for later requests until restart.
  Gemma was therefore run at the server's default temperature. MORENA scored the same 80% floor at
  temperature 0 and at the default. Reported upstream as a candidate issue.

The "maintainer read" is by the project team, **not** native-speaker review, and every note is in the results JSON (`maintainer_read`). Native-speaker grading replaces it in v0.1.
