# Project: `md`

Bun workspace, two packages: `packages/md` = the `md` CLI (`@rprtr258/md`), `packages/pi` = pi extension package (`@rprtr258/md-pi`) that depends on the CLI and exposes its commands as agent tools.

- Run CLI: `bun packages/md/index.ts`
- Design: unix-style, pipe-oriented — commands take files/stdin and print plain text to stdout; keep them composable in pipelines.
- After any complete change, run `bun run ci` (typecheck + tests) and fix all failures before considering the change done.
