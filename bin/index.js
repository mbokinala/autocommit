#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const child_process_1 = require("child_process");
const zod_1 = require("zod");
const commander_1 = require("commander");
commander_1.program.name("autocommit");
commander_1.program.option("--openai-api-key <key>", "OpenAI API key");
commander_1.program.option("--dry-run", "Dry run (print the commit message but do not commit)");
commander_1.program.option("-a, --all", "add all changes to the commit");
commander_1.program.parse();
const options = commander_1.program.opts();
const OPENAI_API_KEY = options.openaiApiKey || process.env.OPENAI_API_KEY;
// check for OPENAI_API_KEY
if (!OPENAI_API_KEY) {
    console.log("No OpenAI API key found. Please set your OpenAI API key in the environment variables or pass it using --openai-api-key");
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
    const { object } = await (0, ai_1.generateObject)({
        model: openai("gpt-4o"),
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
main();
