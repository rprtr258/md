#!/usr/bin/env bun
import {Command} from "commander";
import {frontmatter, links, list, map, section, stats, toc, read} from "@rprtr258/md-common/md.ts";
import {lint, lintSchema} from "@rprtr258/md-common/lint.ts";
import {web} from "@rprtr258/md-common/web.ts";
import {convert} from "@rprtr258/md-common/convert.ts";

const program = new Command()
  .name("md")
  .version("0.0.5")
  .description("Markdown tool")
  .action((): void => program.outputHelp());

const get = program
  .command("get")
  .description("Print parts of a markdown file (- reads stdin)")
  .action((): void => get.outputHelp());

get
  .command("frontmatter")
  .description("Print the frontmatter of a markdown file")
  .arguments("<file>")
  .option("--json", "Print the frontmatter parsed as JSON")
  .action(async (file: string, options: {json?: boolean}) => {
    const out = frontmatter(await read(file), options.json ?? false);
    if (out !== undefined)
      console.log(out);
  });

get
  .command("links")
  .description("Print every link/image/autolink URL of a markdown file")
  .arguments("<file>")
  .action(async (file: string) => {
    for (const url of links(await read(file))) {
      console.log(url);
    }
  });
program
  .command("toc")
  .description("Print the table of contents (headers) of a markdown file (- reads stdin)")
  .arguments("<file>")
  .action(async (file: string) => {
    const out = toc(await read(file));
    if (out)
      console.log(out);
  });
program
  .command("section")
  .description("Print everything under a heading of a markdown file (- reads stdin)")
  .arguments("<file> <heading>")
  .action(async (file: string, heading: string) => {
    console.log(section(await read(file), heading));
  });
program
  .command("stats")
  .description("Print line counts and size of a markdown file (- reads stdin)")
  .arguments("<file>")
  .action(async (file: string) => {
    console.log(stats(await read(file)));
  });
program
  .command("list")
  .description("List all available markdown files")
  .arguments("[directory]")
  .action(async (directory?: string) => {
    const out = await list(directory);
    if (out)
      console.log(out);
  });
const lintCommand = program
  .command("lint")
  .description("Lint a markdown file or directory with static deterministic rules")
  .arguments("[path]")
  .action(async (path?: string) => {
    const out = await lint(path);
    if (out) {
      console.log(out);
      throw new Error("issues found");
    }
  });

lintCommand
  .command("schema")
  .description("Validate the frontmatter of a markdown file against a JSON Schema")
  .arguments("<file> <schema>")
  .action(async (file: string, schema: string) => {
    const out = await lintSchema(file, schema);
    if (out) {
      console.log(out);
      throw new Error("issues found");
    }
  });
program
  .command("web")
  .description("Render a markdown file to a temporary HTML file and open it in a browser (- reads stdin)")
  .arguments("<file>")
  .action(async (file: string) => web(await read(file)));
program
  .command("map")
  .description("Print each markdown file in a directory with its heading tree beneath it")
  .arguments("[directory]")
  .option("--title", "Print each file's title heading on one line")
  .action(async (directory: string | undefined, options: {title?: boolean}) => {
    const out = await map(directory, options.title);
    if (out)
      console.log(out);
  });
program
  .command("convert")
  .description("Converts given file to text")
  .arguments("<file>")
  .action(async (file: string) => {
    process.stdout.write(await convert(file));
  });

export const command = {
  parse: (args?: string[]): Promise<unknown> =>
    program.parseAsync(args ?? process.argv.slice(2), {from: "user"}),
};

if (import.meta.main) {
  try {
    await command.parse();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
