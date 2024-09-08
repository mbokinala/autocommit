#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const child_process_1 = require("child_process");
const zod_1 = require("zod");
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFIG_FILE = path_1.default.join(process.env.HOME || process.env.USERPROFILE || '', '.autocommit');
function readConfig() {
    try {
        return JSON.parse(fs_1.default.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    catch {
        return {};
    }
}
function writeConfig(config) {
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
commander_1.program
    .name("autocommit")
    .option("--dry-run", "Dry run (print the commit message but do not commit)")
    .option("-a, --all", "add all changes to the commit")
    .action(async (options) => {
    // This is the default action when no subcommand is specified
    const config = readConfig();
    const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const MODEL = config.MODEL || 'gpt-4o';
    if (!OPENAI_API_KEY) {
        console.log("No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'");
        process.exit(1);
    }
    const openai = (0, openai_1.createOpenAI)({
        apiKey: OPENAI_API_KEY,
    });
    // ... existing main function code ...
    if (options.all) {
        (0, child_process_1.execSync)("git add -A", { stdio: "inherit" });
    }
    const diff = await getDiff();
    if (diff.trim().length === 0) {
        console.log("No staged changes to commit, exiting. Re-run with -a to commit all changes or manually add the changes you want to commit with git add <file>.");
        process.exit(1);
    }
    const commitMessage = await generateCommitMessage(diff);
    if (options.dryRun) {
        console.log(commitMessage);
        return;
    }
    (0, child_process_1.spawnSync)("git", [
        "commit",
        "-m",
        commitMessage.summary,
        ...(commitMessage.body ? ["-m", commitMessage.body] : []),
    ], {
        stdio: "inherit",
    });
});
commander_1.program
    .command('config')
    .description('Manage configuration')
    .option('set <key> <value>', 'Set a configuration value')
    .option('get <key>', 'Get a configuration value')
    .action((options) => {
    const config = readConfig();
    if (options.set) {
        config[options.set[0]] = options.set[1];
        writeConfig(config);
        console.log(`Set ${options.set[0]} to ${options.set[1]}`);
    }
    else if (options.get) {
        console.log(config[options.get] || 'Not set');
    }
});
commander_1.program.parse();
const options = commander_1.program.opts();
const config = readConfig();
const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const MODEL = config.MODEL || 'gpt-4o';
// check for OPENAI_API_KEY
if (!OPENAI_API_KEY) {
    console.log("No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'");
    process.exit(1);
}
const openai = (0, openai_1.createOpenAI)({
    apiKey: OPENAI_API_KEY,
});
const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;
async function getDiff() {
    // get the diff
    return (0, child_process_1.execSync)("git --no-pager diff --staged").toString();
}
async function generateCommitMessage(diff) {
    const config = readConfig();
    const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const MODEL = config.MODEL || 'gpt-4o';
    const openai = (0, openai_1.createOpenAI)({
        apiKey: OPENAI_API_KEY,
    });
    const { object } = await (0, ai_1.generateObject)({
        model: openai(MODEL),
        system: SYSTEM_PROMPT,
        prompt: diff,
        schema: zod_1.z.object({
            summary: zod_1.z
                .string()
                .describe("A short single line summary of the changes in the diff"),
            body: zod_1.z
                .string()
                .describe("A more detailed description of the changes in the diff. DO NOT fill this out if the summary is sufficient to describe the changes.")
                .optional(),
        }),
    });
    return object;
}
async function main() {
    if (options.all) {
        (0, child_process_1.execSync)("git add -A", { stdio: "inherit" });
    }
    const diff = await getDiff();
    if (diff.trim().length === 0) {
        console.log("No staged changes to commit, exiting. Re-run with -a to commit all changes or manually add the changes you want to commit with git add <file>.");
        process.exit(1);
    }
    const commitMessage = await generateCommitMessage(diff);
    if (options.dryRun) {
        console.log(commitMessage);
        return;
    }
    (0, child_process_1.spawnSync)("git", [
        "commit",
        "-m",
        commitMessage.summary,
        ...(commitMessage.body ? ["-m", commitMessage.body] : []),
    ], {
        stdio: "inherit",
    });
}
// Check if it's a config command
if (!process.argv.slice(2).includes('config')) {
    main();
}
