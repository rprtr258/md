#!/usr/bin/env bun
import {object, or} from "@optique/core/constructs";
import {formatDocPage} from "@optique/core/doc";
import {formatMessage, message} from "@optique/core/message";
import {optional} from "@optique/core/modifiers";
import {getDocPageSync, parse} from "@optique/core/parser";
import {argument, command as cmd, constant, option} from "@optique/core/primitives";
import type {InferValue} from "@optique/core/parser";
import {string} from "@optique/core/valueparser";
import {frontmatter, links, list, map, section, stats, toc, read, todos} from "@rprtr258/md-common/md.ts";
import {lint, lintSchema} from "@rprtr258/md-common/lint.ts";
import {web} from "@rprtr258/md-common/web.ts";
import {convert} from "@rprtr258/md-common/convert.ts";

const file = argument(string({metavar: "FILE"}));

const parser = or(
  cmd("get", object({
    action: constant("get"),
    sub: optional(or(
      cmd("frontmatter", object({
        command: constant("frontmatter"),
        file,
        json: option("--json"),
      }), {description: message`Print the frontmatter of a markdown file`}),
      cmd("links", object({command: constant("links"), file}),
        {description: message`Print every link/image/autolink URL of a markdown file`}),
      cmd("todos", object({command: constant("todos"), file}),
        {description: message`Print the lines of task list items (- [ ] / - [x]) of a markdown file`}),
    )),
  }), {description: message`Print parts of a markdown file (- reads stdin)`}),
  cmd("toc", object({action: constant("toc"), file}),
    {description: message`Print the table of contents (headers) of a markdown file (- reads stdin)`}),
  cmd("section", object({
    action: constant("section"),
    file,
    heading: argument(string({metavar: "HEADING"})),
  }), {description: message`Print everything under a heading of a markdown file (- reads stdin)`}),
  cmd("stats", object({action: constant("stats"), file}),
    {description: message`Print line counts and size of a markdown file (- reads stdin)`}),
  cmd("list", object({
    action: constant("list"),
    directory: optional(argument(string({metavar: "DIRECTORY"}))),
  }), {description: message`List all available markdown files`}),
  cmd("lint", or(
    cmd("schema", object({
      action: constant("lintSchema"),
      file,
      schema: argument(string({metavar: "SCHEMA"})),
    }), {description: message`Validate the frontmatter of a markdown file against a JSON Schema`}),
    object({
      action: constant("lint"),
      pathArg: optional(argument(string({metavar: "PATH"}))),
    }),
  ), {description: message`Lint a markdown file or directory with static deterministic rules`}),
  cmd("web", object({action: constant("web"), file}),
    {description: message`Render a markdown file to a temporary HTML file and open it in a browser (- reads stdin)`}),
  cmd("map", object({
    action: constant("map"),
    directory: optional(argument(string({metavar: "DIRECTORY"}))),
    title: option("--title"),
  }), {description: message`Print each markdown file in a directory with its heading tree beneath it`}),
  cmd("convert", object({action: constant("convert"), file}),
    {description: message`Converts given file to text`}),
);

const mainHelp = formatDocPage("md", getDocPageSync(parser)!).trimEnd();
const getHelp = formatDocPage("md", getDocPageSync(parser, ["get"])!).trimEnd();

async function dispatch(value: InferValue<typeof parser>): Promise<void> {
  switch (value.action) {
    case "get":
      if (value.sub === undefined) {
        console.log(getHelp);
        return;
      }
      switch (value.sub.command) {
        case "frontmatter": {
          const out = frontmatter(await read(value.sub.file), value.sub.json);
          if (out !== undefined) console.log(out);
          return;
        }
        case "links":
          for (const url of links(await read(value.sub.file))) console.log(url);
          return;
        case "todos":
          for (const line of todos(await read(value.sub.file))) console.log(line);
          return;
      }
      return;
    case "toc": {
      const out = toc(await read(value.file));
      if (out) console.log(out);
      return;
    }
    case "section":
      console.log(section(await read(value.file), value.heading));
      return;
    case "stats":
      console.log(stats(await read(value.file)));
      return;
    case "list": {
      const out = await list(value.directory);
      if (out) console.log(out);
      return;
    }
    case "lint": {
      const out = await lint(value.pathArg);
      if (out) {
        console.log(out);
        throw new Error("issues found");
      }
      return;
    }
    case "lintSchema": {
      const out = await lintSchema(value.file, value.schema);
      if (out) {
        console.log(out);
        throw new Error("issues found");
      }
      return;
    }
    case "web":
      await web(await read(value.file));
      return;
    case "map": {
      const out = await map(value.directory, value.title);
      if (out) console.log(out);
      return;
    }
    case "convert":
      process.stdout.write(await convert(value.file));
      return;
  }
}

export const command = {
  parse: async (args?: string[]): Promise<unknown> => {
    const argv = args ?? process.argv.slice(2);
    if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
      console.log(mainHelp);
      return;
    }
    const result = parse(parser, argv);
    if (!result.success) throw new Error(formatMessage(result.error));
    await dispatch(result.value);
  },
};

if (import.meta.main) {
  try {
    await command.parse();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
