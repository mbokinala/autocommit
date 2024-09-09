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
const commander_2 = require("commander");
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
function getOpenAIKey() {
    const config = readConfig();
    return config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}
function getModel() {
    const config = readConfig();
    return config.MODEL || 'gpt-4o';
}
const configCommand = new commander_2.Command('config')
    .description('Manage configuration')
    .argument('<action>', 'Action to perform: "set" or "get"')
    .argument('[key]', 'Configuration key')
    .argument('[value]', 'Configuration value (for "set" action)')
    .action((action, key, value) => {
    console.log('Config command called with:', { action, key, value });
    try {
        const config = readConfig();
        console.log('Current config:', config);
        if (action === 'set' && key && value) {
            const upperKey = key.toUpperCase();
            config[upperKey] = value;
            console.log(`Attempting to set ${upperKey} to ${value}`);
            writeConfig(config);
            console.log(`Config after set:`, readConfig());
        }
        else if (action === 'get' && key) {
            const upperKey = key.toUpperCase();
            console.log(`Value for ${upperKey}:`, config[upperKey] || 'Not set');
        }
        else {
            console.log('Invalid command. Use "config set <key> <value>" or "config get <key>"');
        }
    }
    catch (error) {
        console.error('Error in config command:', error);
    }
});
commander_1.program.addCommand(configCommand);
commander_1.program
    .name("autocommit")
    .option("--dry-run", "Dry run (print the commit message but do not commit)")
    .option("-a, --all", "add all changes to the commit")
    .action(async (options) => {
    const OPENAI_API_KEY = getOpenAIKey();
    const MODEL = getModel();
    if (!OPENAI_API_KEY) {
        console.log("No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'");
        process.exit(1);
    }
    const openai = (0, openai_1.createOpenAI)({
        apiKey: OPENAI_API_KEY,
    });
    if (options.all) {
        (0, child_process_1.execSync)("git add -A", { stdio: "inherit" });
    }
    const diff = await getDiff();
    if (diff.trim().length === 0) {
        console.log("No staged changes to commit, exiting. Re-run with -a to commit all changes or manually add the changes you want to commit with git add <file>.");
        process.exit(1);
    }
    const commitMessage = await generateCommitMessage(diff, openai, MODEL);
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
commander_1.program.parse();
const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;
async function getDiff() {
    return (0, child_process_1.execSync)("git --no-pager diff --staged").toString();
}
async function generateCommitMessage(diff, openai, model) {
    const { object } = await (0, ai_1.generateObject)({
        model: openai(model),
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
