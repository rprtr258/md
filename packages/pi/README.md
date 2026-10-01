# @rprtr258/md-pi

[pi](https://github.com/earendil-works/pi-coding-agent) package that turns the [`@rprtr258/md`](https://www.npmjs.com/package/@rprtr258/md) CLI into agent tools. Your agent answers questions about markdown files with exact, deterministic commands — frontmatter, links, TOC, lint — instead of reading whole files or writing throwaway scripts.

- **10 tools**, one per `md` subcommand, all read-only.
- **PDF & PNG in.** `md_convert` turns PDFs and scanned PNGs into markdown.
- **No global CLI install.** The CLI ships as a dependency; the only requirement is [bun](https://bun.com) on the PATH.

## Install

```bash
pi install npm:@rprtr258/md-pi
```

That's it. Check `bun --version` if it doesn't work — every tool runs the CLI through bun. Then start a new pi session and just ask, e.g. *"lint every markdown file in docs/"* or *"what's the frontmatter of README.md?"* — the agent picks the matching `md_*` tool.

## Tools

| Tool | What it does |
|---|---|
| `md_frontmatter` | print a file's YAML frontmatter (optionally as JSON) |
| `md_links` | print every link/image/autolink URL, one per line |
| `md_toc` | print the table of contents |
| `md_section` | print everything under a heading |
| `md_stats` | line counts and file size |
| `md_list` | list all markdown files in a directory (recursive) |
| `md_lint` | static deterministic lint, file or directory |
| `md_lint_schema` | validate frontmatter against a JSON Schema file |
| `md_map` | heading tree for every file in a directory |
| `md_convert` | convert a PDF or PNG file to markdown text |

## Install from source

```bash
git clone https://github.com/rprtr258/md && cd md
pi install ./packages/pi    # install in place
pi -e ./packages/pi         # or try once, nothing persisted
```

There is no git install source: `pi install git:...` looks at the repo root, which is the CLI package, not this one.
