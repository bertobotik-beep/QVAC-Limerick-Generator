# QVAC Limerick Generator

Enter a topic or word and an on-device AI writes a short original 5-line limerick about it. No cloud call, no API key.

## Run

```bash
npm install
npm start
```

Then open http://localhost:31020

Requires Node.js >= 22.17 (see `engines` in `package.json`).

## QVAC SDK version

`@qvac/sdk` ^0.19.0 (see `package.json`).

## How it works

Built on [Tether's QVAC SDK](https://www.npmjs.com/package/@qvac/sdk) — all inference runs on-device, no cloud call, no API key.

1. `loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 })` loads the model once at startup, before the HTTP server starts accepting requests.
2. Each `POST /api/limerick` request calls `completion()` with a one-shot example baked into the chat history (a real user/assistant turn, not just prose instructions) and streams the reply token-by-token via `run.tokenStream`.
3. `unloadModel({ modelId })` releases the model on `SIGINT`/`SIGTERM`.

The response is passed through `generate()` in `src/limerick.js`, which strips a "Here's a limerick:" style preamble and surrounding quotes, and specifically checks for the one-shot example's own subject ("clumsy cat") leaking into a limerick about an unrelated topic. If the result looks unusable (empty, a refusal, or over 500 characters), a deterministic fallback limerick template filled in with the topic (no model involved) is returned instead.

### Example

Input:

> a clumsy cat

Output:

```
There once was a cat quite clumsy,
Whose steps were forever quite crumbsy,
It tripped on its tail,
And slid down the rail,
Then landed all fuzzy and grumbsy.
```

This exact pair is also the one-shot example baked into the prompt (see `EXAMPLE_INPUT`/`EXAMPLE_OUTPUT` in `src/limerick.js`).

## License

MIT
