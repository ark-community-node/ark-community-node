# Architecture

```
 Phones (no data)                 Community Node (mini-PC / Pi, solar-capable)
 ┌──────────┐   local Wi-Fi   ┌───────────────────────────────────────────────┐
 │ browser  │ ──────────────▶ │ gateway/  (this repo)                         │
 └──────────┘                 │   • serves chat page                          │
                              │   • optional access code                      │
                              │   • one-at-a-time queue, timing-only logs     │
                              │          │ OpenAI-compatible HTTP (loopback)  │
                              │          ▼                                    │
                              │ local runtime: llama.cpp / Ollama / QVAC      │
                              │   open-weight models (MORENA, Qwen, Gemma…)   │
                              │                                               │
                              │ [planned] LDK Node wallet + prepaid metering  │
                              │ [planned] L402 API for agents / other Nodes   │
                              │ [planned] Mesh LLM peer for pooled compute    │
                              └───────────────────────────────────────────────┘
                                         │ occasional sync (hotspot / visit)
                                         ▼
                                Lightning settlement, model & benchmark updates
```

## Design decisions

- **Gateway on 0.0.0.0, runtime on 127.0.0.1.** Phones never talk to the model server directly.
- **OpenAI-compatible boundary.** It's the most widely supported local API, so swapping runtimes or models is a config change.
- **Single generation slot.** Small hardware does one answer at a time. Others wait in a FIFO queue, and a busy signal is better than a crash.
- **No content logging.** Privacy is the point. Logs hold timestamps, latency and byte counts only.

## Payments (planned, see ROADMAP)

People buy prepaid credit for cash (printed voucher) or mobile money. The Node deducts credit per
task **offline**, and its operator's self-custodial LDK Node wallet settles over Lightning whenever
connectivity appears. The same per-task price is exposed to software agents via **L402**
(HTTP 402 + Lightning invoice + macaroon), so machines pay the way people do.

Open design questions are tracked as issues: offline double-spend protection, voucher format,
and custody and legal posture per country.
