import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, ".editorconfig");

function printHelp() {
  console.log(`Usage: editorconfig [destDir]

  Copies .editorconfig from @istok-dev/editorconfig into your project.

Options:
  --help, -h     Show this message

Arguments:
  destDir        Directory to place .editorconfig in (default: current working directory)
`);
}

function parseArgs(args) {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }
  const positional = args.filter((a) => !a.startsWith("-"));
  const destDir = positional[0] ? resolve(positional[0]) : process.cwd();
  return { help: false, destDir };
}

/** @param {string[]} args */
export async function run(args = []) {
  const parsed = parseArgs(args);
  if (parsed.help) {
    printHelp();
    return;
  }

  const dest = join(parsed.destDir, ".editorconfig");
  await mkdir(parsed.destDir, { recursive: true });
  await copyFile(SOURCE, dest);
  console.log(`Wrote ${dest}`);
}
