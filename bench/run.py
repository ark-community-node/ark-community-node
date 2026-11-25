#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Run benchmark items against a local OpenAI-compatible endpoint. Stdlib only."""
import argparse, json, time, urllib.request, datetime, os, sys


def load(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def ask(endpoint, model, prompt, timeout, max_tokens=1500):
    body = {"messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens, "temperature": 0}
    if model:
        body["model"] = model
    req = urllib.request.Request(endpoint.rstrip("/") + "/v1/chat/completions",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.load(r)
    ch = data["choices"][0]
    content = (ch["message"].get("content") or "").strip()
    if not content:
        # Reasoning models can spend the whole budget thinking. That's a harness/budget problem,
        # not a wrong answer, so surface it as an error instead of a silent fail.
        raise RuntimeError(f"empty answer (finish_reason={ch.get('finish_reason')})")
    return content, time.time() - t0


def degenerate(answer, prompt):
    """Catch answers that would fool a keyword check: repetition loops or echoing the prompt."""
    words = answer.lower().split()
    if len(words) >= 12:
        grams = [" ".join(words[i:i + 3]) for i in range(len(words) - 2)]
        top = max(grams.count(g) for g in set(grams))
        if top >= 4:
            return "repetition loop"
    p = prompt.lower().strip(" ?.!")
    if len(p) > 20 and p[:40] in answer.lower():
        return "echoes the prompt"
    return None


def check(answer, item):
    if degenerate(answer, item["prompt"]):
        return False
    keys = item.get("must_include_any") or []
    a = answer.lower()
    return any(k.lower() in a for k in keys) if keys else None


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--endpoint", required=True)
    p.add_argument("--model", default="")
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--timeout", type=float, default=180)
    p.add_argument("--max-tokens", type=int, default=1500)
    p.add_argument("--reviewed-only", action="store_true", help="skip items without native-speaker review")
    a = p.parse_args(argv)
    items = load(a.data)
    if a.reviewed_only:
        items = [i for i in items if i.get("reviewed_by")]
    rows = []
    for it in items:
        try:
            ans, secs = ask(a.endpoint, a.model, it["prompt"], a.timeout, a.max_tokens)
            rows.append({"id": it["id"], "pass": check(ans, it), "degenerate": degenerate(ans, it["prompt"]), "seconds": round(secs, 2), "answer": ans})
        except Exception as e:  # keep going; record failure
            rows.append({"id": it["id"], "pass": False, "error": str(e)})
        print(it["id"], rows[-1].get("pass"), rows[-1].get("seconds"), file=sys.stderr)
    scored = [r for r in rows if r.get("pass") is not None and "error" not in r]
    summary = {
        "model": a.model, "endpoint": a.endpoint, "data": os.path.basename(a.data),
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "items": len(rows), "errors": sum(1 for r in rows if "error" in r), "keyword_pass_rate": round(sum(1 for r in scored if r["pass"]) / len(scored), 3) if scored else None,
        "reviewed_items": sum(1 for i in items if i.get("reviewed_by")),
        "note": "keyword pass rate is a floor check, not a quality score",
    }
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "results": rows}, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
