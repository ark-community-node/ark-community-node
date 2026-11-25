# Built on open infrastructure

Ark Community Node doesn't reinvent the hard parts. It packages existing open projects for a
setting they weren't designed for: rural, low-power, intermittently connected, local-language.
Status labels are honest: **Verified** means we ran it ourselves; **Planned** means designed only.

| Layer | Project | Licence | How we use it | Status |
|---|---|---|---|---|
| Inference runtime | **Mesh LLM** (Skippy / llama.cpp) | Apache-2.0 | Serves the Node's model through an OpenAI-compatible API on loopback. Our gateway sits in front of it | ✅ Verified 25 Nov 2026 (v0.80.0, macOS arm64): phone page → gateway → Mesh LLM answered in 0.7 s; no non-loopback sockets open with analytics disabled |
| Pooling across Nodes | **Mesh LLM** private mesh | Apache-2.0 | A school and a clinic join one **unpublished, owner-restricted** mesh, so either can serve the other's requests or split a larger model | ⏳ Planned (needs 2 boxes) |
| Paid inference between Nodes | **Mesh LLM `ln-payments-plugin`** + NWC/Lexe wallet plugin | Apache-2.0 | Nodes earn sats when peers use their compute. Lightning is Mesh LLM's first payment rail | ⏳ Planned (plugin is experimental upstream) |
| Operator wallet | **LDK Node / LDK Server** | MIT / Apache-2.0 dual | Self-custodial Lightning wallet for each Node operator; candidate NWC backend for the payments plugin | ⏳ Planned (LDK Server pre-v0.1: test funds only) |
| Local agent | **Goose** (Open Intelligence Kit) + MCP | Apache-2.0 | Offline tool pack: crop calendar, school maths, letter templates, health information leaflets | ⏳ Planned |
| Models | MORENA (Vambo AI), Qwen, Gemma | see `MODELS.md` | Swappable. Chosen by our open benchmark, not by hype | 🟡 Benchmarking |

## Privacy settings we apply to Mesh LLM

The promise to users is that **no prompt leaves the box**. Mesh LLM's defaults are built for an
internet mesh, so a Node turns these off explicitly:

```sh
mesh-llm analytics disable          # on by default: anonymous usage reporting
mesh-llm serve --local-model-only --gguf /models/<model>.gguf   # single box: no peers, no discovery
```

- **Never `--auto` or `--publish`** on a community Node. Both discover or advertise over public
  Nostr relays and the public mesh.
- For multi-box pooling, create an **unpublished** mesh with owner-restricted admission
  (`--owner-key`, `--trust-policy require-owned`, `--require-signed-gossip`). Per Mesh LLM's own docs, a join token alone is
  *connectivity material, not authorisation*.
- Mesh LLM encrypts peer traffic end to end (QUIC). Admission control decides who may join.

## Why this matters to the upstream projects

Every one of these was built and tested mostly on well-connected developer machines. A Node in
Western Kenya stress-tests them on solar power, flaky links and 8–16 GB machines. We'll file
issues and PRs upstream for every problem we hit, and we'll publish our configuration as a
reference deployment.
