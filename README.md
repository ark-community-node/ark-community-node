# Ark Community Node

**Open, offline AI in local languages, for communities without mobile data.**

Ark Community Node turns a low-cost computer (a mini-PC or a Raspberry Pi) into a local AI hub.
People join its Wi-Fi on any phone, open a browser and ask questions in Swahili or English.
They need no data bundle and no app, and **no prompt ever leaves the room**.

> Status: **early / pre-alpha.** This repo has a working local gateway and chat page, plus the
> start of an open Swahili benchmark. Lightning metering, Mesh LLM pooling and fine-tuned models
> are on the [roadmap](ROADMAP.md) and **not built yet**. We'd rather tell you that than overclaim.

## Why

- In rural Kenya only about a quarter of people use the internet. The main barrier is the cost of data and devices, not interest.
- Open models are now small enough to run on a ~USD 300 box. Nobody has packaged them so a school,
  chama, clinic or kiosk can just switch one on, keep it running and pay for it.
- Where data is unaffordable, a local open model is faster, cheaper and more private than any
  closed cloud API. Open becomes the *better* option.

## What's here today

| Part | Path | State |
|---|---|---|
| Local gateway + mobile chat page | `gateway/` | ✅ Works with any OpenAI-compatible local runtime. **Reference runtime: [Mesh LLM](https://github.com/Mesh-LLM/mesh-llm)** (verified). llama.cpp, Ollama and QVAC also work |
| Built on open infrastructure | `docs/SPIRAL_STACK.md` | Mesh LLM, LDK, Goose: what's verified vs planned |
| Swahili benchmark harness | `bench/` | 🟡 Harness works; seed items are **drafts awaiting native-speaker review** |
| Architecture | `docs/ARCHITECTURE.md` | ✅ |
| Lightning metering (LDK Node, L402) | — | ⏳ Planned |
| Mesh LLM pooling across Nodes | — | ⏳ Planned |
| Swahili fine-tunes + data cards | — | ⏳ Planned |

## Quick start (any laptop)

1. Serve a local model with [Mesh LLM](https://github.com/Mesh-LLM/mesh-llm) (reference runtime):
   ```sh
   mesh-llm analytics disable   # keep the box fully private
   mesh-llm serve --local-model-only --gguf /absolute/path/model.gguf   # API on 127.0.0.1:9337
   curl -s localhost:9337/v1/models   # copy the model id
   ```
   Any OpenAI-compatible server works too, for example `llama-server -m model.gguf --port 8080`.
2. Start the gateway:
   ```sh
   cd gateway
   UPSTREAM=http://127.0.0.1:9337 MODEL=<model id> node server.mjs
   ```
3. On a phone on the same Wi-Fi, open `http://<box-ip>:8088`.

Optional: set `ACCESS_CODE=...` to require a shared code (handy for pilots).

## Principles

1. **Local first.** Inference runs on the Node. The gateway never calls the internet.
2. **No prompt logging.** The gateway records timing only, never message content.
3. **Runtime-agnostic.** Any OpenAI-compatible local server works. No lock-in to one model or vendor.
4. **Works without us.** Nothing here depends on an Ark Node AI server. If it only ran with us,
   it wouldn't really be open.
5. **Measured, not claimed.** Every speed or quality number we publish comes with the script that produced it.

## Relationship to Ark Node AI

This project is maintained by the founder of [Ark Node AI](https://arknode.ai), a pay-per-task AI
service in Kenya paid with Bitcoin Lightning and M-Pesa. Ark Node AI is a separate commercial
product. **This repository is an independent, non-commercial open-source project**, licensed
Apache-2.0. Anyone, including Ark Node AI, may deploy it on the same terms.

## Licence

Apache License 2.0. See [LICENSE](LICENSE). Third-party models keep their own licences. See `docs/MODELS.md`.
