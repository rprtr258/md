# Project: `md`

Bun workspace: repo root = the `md` CLI (`@rprtr258/md`), `common/` = the core (`@rprtr258/md-common`), `pi/` = pi extension package (`@rprtr258/md-pi`) that exposes the CLI's commands as agent tools.

- Run CLI: `bun index.ts`
- Design: unix-style, pipe-oriented — commands take files/stdin and print plain text to stdout; keep them composable in pipelines.
- After any complete change, run `bun run ci` (typecheck + tests) and fix all failures before considering the change done.
