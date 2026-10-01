# @rprtr258/md-pi

[pi](https://github.com/earendil-works/pi-coding-agent) package exposing the [`@rprtr258/md`](https://www.npmjs.com/package/@rprtr258/md) CLI as agent tools. Each tool spawns the CLI (`bun index.ts ...`) and returns its output, so [bun](https://bun.com) must be on the PATH.

## Install

```bash
pi install npm:@rprtr258/md-pi   # from npm (after publishing)
pi install ./packages/pi                # local, from the repo root
pi -e ./packages/pi                     # try once, nothing persisted
```

Git installs clone the repo root — that's the CLI package, so there is no git source for the extension unless it moves to its own repo.

## Tools

`md_frontmatter`, `md_links`, `md_toc`, `md_section`, `md_stats`, `md_list`, `md_lint`, `md_lint_schema`, `md_map`, `md_convert` — one per `md` subcommand (except `web`, which opens a browser).
