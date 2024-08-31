#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@ai-sdk/openai");
const ai_1 = require("ai");
const child_process_1 = require("child_process");
const zod_1 = require("zod");
// check for process.env.OPENAI_API_KEY
if (!process.env.OPENAI_API_KEY) {
    console.log("No OpenAI API key found. Please set your OpenAI API key in the environment variables.");
    process.exit(1);
}
const openai = (0, openai_1.createOpenAI)({
    apiKey: process.env.OPENAI_API_KEY,
});
const args = process.argv.slice(2);
const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;
// get the diff
const diff = (0, child_process_1.execSync)("git --no-pager diff --staged").toString();
if (diff.trim().length === 0) {
    console.log("No staged changes to commit, exiting. Did you forget to run `git add`?");
    process.exit(0);
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
generateCommitMessage(diff).then((commitMessage) => {
    // execute the git commit command
    (0, child_process_1.execSync)(`git commit -m "${commitMessage.summary}" -m "${commitMessage.body}"`, { stdio: "inherit" });
});
