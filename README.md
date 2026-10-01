# md

Bun workspace with two packages:

- `packages/md` — `@rprtr258/md`, the `md` CLI
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

`packages/pi` depends on the CLI package and registers its commands as agent tools: `md_frontmatter`, `md_links`, `md_toc`, `md_section`, `md_stats`, `md_list`, `md_lint`, `md_lint_schema`, `md_map`, `md_convert`. Each tool spawns the CLI (`bun index.ts ...`), so [bun](https://bun.com) must be on the PATH.

Install: `pi install npm:@rprtr258/md-pi` (or `pi install ./packages/pi` locally) — see `packages/pi/README.md`.

Publish both packages:

```bash
(cd packages/md && npm publish --access public)
(cd packages/pi && npm publish --access public)
```
