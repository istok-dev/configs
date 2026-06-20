import { access, copyFile, cp, mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG_CANDIDATES = [
  "istok.config.js",
  "istok.config.mjs",
  "istok.config.json",
];
const SKILLS_DIR = join(__dirname, "skills");
const EDITORCONFIG_SOURCE = join(__dirname, "editorconfig", ".editorconfig");
const SKILLS_DEST = ".agents/skills";

/** @param {string} path */
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** @returns {Promise<string[]>} */
async function listAvailableSkills() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    const skillFile = join(SKILLS_DIR, entry.name, "SKILL.md");
    if (await fileExists(skillFile)) {
      skills.push(entry.name);
    }
  }

  return skills.sort();
}

/**
 * @param {unknown} config
 * @param {string} configPath
 * @returns {{ skills: string[], editorconfig: boolean }}
 */
function validateConfig(config, configPath) {
  if (!config || typeof config !== "object") {
    throw new Error(
      `${configPath} must define { skills?: string[], editorconfig?: boolean }`,
    );
  }

  const { skills, editorconfig } = config;

  if (skills !== undefined && !Array.isArray(skills)) {
    throw new Error(`${configPath}: skills must be string[]`);
  }

  if (editorconfig !== undefined && typeof editorconfig !== "boolean") {
    throw new Error(`${configPath}: editorconfig must be boolean`);
  }

  return {
    skills: skills ?? [],
    editorconfig: editorconfig ?? false,
  };
}

/** @param {string} configPath */
async function loadConfig(configPath) {
  const ext = extname(configPath);

  if (ext === ".json") {
    const raw = await readFile(configPath, "utf8");
    return validateConfig(JSON.parse(raw), configPath);
  }

  if (ext === ".js" || ext === ".mjs") {
    const mod = await import(pathToFileURL(configPath).href);
    return validateConfig(mod.default ?? mod, configPath);
  }

  throw new Error(
    `Unsupported config format "${ext}". Use .js, .mjs, or .json`,
  );
}

/** @param {string} cwd */
async function resolveConfigPath(cwd) {
  for (const name of CONFIG_CANDIDATES) {
    const path = join(cwd, name);
    if (await fileExists(path)) {
      return path;
    }
  }

  throw new Error(
    `Config not found. Create one of: ${CONFIG_CANDIDATES.join(", ")}`,
  );
}

function printHelp() {
  console.log(`Usage: istok [options]

  Applies project configs from @istok-dev/istok-configs according to istok.config.*

Options:
  --config, -c    Path to config file (default: first found in cwd)
  --help, -h      Show this message

Supported config files (first match wins):
  istok.config.js
  istok.config.mjs
  istok.config.json

Config example (JS/MJS):
  export default {
    skills: ["prisma", "next-project-structure"],
    editorconfig: true,
  };

Config example (JSON):
  {
    "skills": ["prisma", "next-project-structure"],
    "editorconfig": true
  }
`);
}

/** @param {string[]} args */
function parseArgs(args) {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  let configPath;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--config" || arg === "-c") {
      configPath = resolve(args[++i] ?? "");
    } else if (!arg.startsWith("-")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return {
    help: false,
    cwd: process.cwd(),
    configPath,
  };
}

/** @param {string} cwd @param {string[]} requestedSkills */
async function copySkills(cwd, requestedSkills) {
  const available = await listAvailableSkills();
  const availableSet = new Set(available);

  for (const name of requestedSkills) {
    if (!availableSet.has(name)) {
      throw new Error(
        `Unknown skill "${name}". Available: ${available.join(", ")}`,
      );
    }
  }

  if (requestedSkills.length === 0) {
    return;
  }

  const destRoot = join(cwd, SKILLS_DEST);
  await mkdir(destRoot, { recursive: true });

  for (const name of requestedSkills) {
    const source = join(SKILLS_DIR, name);
    const dest = join(destRoot, name);
    await cp(source, dest, { recursive: true, force: true });
    console.log(`Copied ${name} -> ${join(SKILLS_DEST, name)}`);
  }
}

/** @param {string} cwd */
async function copyEditorconfig(cwd) {
  const dest = join(cwd, ".editorconfig");
  await copyFile(EDITORCONFIG_SOURCE, dest);
  console.log(`Wrote .editorconfig`);
}

/** @param {string[]} args */
export async function run(args = []) {
  const parsed = parseArgs(args);
  if (parsed.help) {
    printHelp();
    return;
  }

  const { cwd, configPath: explicitConfigPath } = parsed;
  const configPath =
    explicitConfigPath ?? (await resolveConfigPath(cwd));

  if (explicitConfigPath && !(await fileExists(configPath))) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const { skills, editorconfig } = await loadConfig(configPath);

  if (skills.length === 0 && !editorconfig) {
    console.log("Nothing configured");
    return;
  }

  if (editorconfig) {
    await copyEditorconfig(cwd);
  }

  await copySkills(cwd, skills);
}
