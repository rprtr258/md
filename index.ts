import {Command} from "@cliffy/command";
import {frontmatter, links, list, map, section, stats, toc, read} from "./md.ts";
import {lint, lintSchema} from "./lint.ts";
import {web} from "./web.ts";
import {convert} from "./convert.ts";

export const command = new Command()
  .name("md")
  .version("0.0.1")
  .description("Markdown tool")
  .action((): void => command.showHelp())
  .command("get", new Command()
    .description("Print parts of a markdown file (- reads stdin)")
    .command("frontmatter", new Command()
      .description("Print the frontmatter of a markdown file")
      .arguments("<file:string>")
      .option("--json", "Print the frontmatter parsed as JSON")
      .action(async (_options, file: string) => {
        const json = _options.json ?? false;
        const out = frontmatter(await read(file), json);
        if (out !== undefined)
          console.log(out);
      }),
    )
    .command("links", new Command()
      .description("Print every link/image/autolink URL of a markdown file")
      .arguments("<file:string>")
      .action(async (_options, file: string) => {
        for (const url of links(await read(file))) {
          console.log(url);
        }
      }),
    ),
  )
  .command("toc", new Command()
    .description("Print the table of contents (headers) of a markdown file (- reads stdin)")
    .arguments("<file:string>")
    .action(async (_options, file: string) => {
      const out = toc(await read(file));
      if (out)
        console.log(out);
    }),
  )
  .command("section", new Command()
    .description("Print everything under a heading of a markdown file (- reads stdin)")
    .arguments("<file:string> <heading:string>")
    .action(async (_options, file: string, heading: string) => {
      console.log(section(await read(file), heading));
    }),
  )
  .command("stats", new Command()
    .description("Print line counts and size of a markdown file (- reads stdin)")
    .arguments("<file:string>")
    .action(async (_options, file: string) => {
      console.log(stats(await read(file)));
    }),
  )
  .command("list", new Command()
    .description("List all available markdown files")
    .arguments("[directory:string]")
    .action((_options, directory?: string) => list(directory)),
  )
  .command("lint", new Command()
    .description("Lint a markdown file or directory with static deterministic rules")
    .arguments("[path:string]")
    .action((_options, path?: string) => lint(path))
    .command("schema", new Command()
      .description("Validate the frontmatter of a markdown file against a JSON Schema")
      .arguments("<file:string> <schema:string>")
      .action(async (_options, file: string, schema: string) => lintSchema(file, schema)),
    ),
  )
  .command("web", new Command()
    .description("Render a markdown file to a temporary HTML file and open it in a browser (- reads stdin)")
    .arguments("<file:string>")
    .action(async (_options, file: string) => web(await read(file))),
  )
  .command("map", new Command()
    .description("Print each markdown file in a directory with its heading tree beneath it")
    .arguments("[directory:string]")
    .option("--title", "Print each file's title heading on one line")
    .action((_options, directory?: string) => map(directory, _options.title)),
  )
  .command("convert", new Command()
    .description("Converts given file to text")
    .arguments("<file:string>")
    .action(async (_options, file: string) => {
      process.stdout.write(await convert(file));
    }),
  );

if (import.meta.main) {
  try {
    await command.parse();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
