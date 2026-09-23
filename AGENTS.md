# Project: `md` CLI

Markdown tool (`index.ts`).

- Run: `bun index.ts`
- Design: unix-style, pipe-oriented — commands take files/stdin and print plain text to stdout; keep them composable in pipelines.
- After any complete change, run `bun run ci` (typecheck + tests) and fix all failures before considering the change done.
