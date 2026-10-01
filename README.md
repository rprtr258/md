# md

Bun workspace with three packages:

- `packages/common` — `@rprtr258/md-common`, the core: parsing, lint, conversion
- `packages/md` — `@rprtr258/md`, the `md` CLI on top of common
- `packages/pi` — `@rprtr258/md-pi`, a [pi](https://github.com/earendil-works/pi-coding-agent) package exposing the CLI as agent tools

## CLI

Install globally, no checkout needed:

```bash
bun add -g github:rprtr258/md    # straight from git
bun add -g @rprtr258/md          # from npm (after publishing)
```

Or run from a checkout:

```bash
bun install
bun packages/md/index.ts
```

Commands: `get frontmatter`, `get links`, `toc`, `section`, `stats`, `list`, `lint`, `lint schema`, `web`, `map`, `convert` — see `md --help`.

## pi package

`packages/pi` depends on the core package and registers one agent tool per CLI subcommand: `md_frontmatter`, `md_links`, `md_toc`, `md_section`, `md_stats`, `md_list`, `md_lint`, `md_lint_schema`, `md_map`, `md_convert`. The tools import `md-common` directly and run in pi's process — no spawning, no bun on the PATH.

Install: `pi install npm:@rprtr258/md-pi` (or `pi install ./packages/pi` locally) — see `packages/pi/README.md`.

Publish all three packages (use `bun publish` — it rewrites `workspace:*` deps; `npm publish` leaves them broken):

```bash
(cd packages/common && bun publish)
(cd packages/md && bun publish)
(cd packages/pi && bun publish)
```
