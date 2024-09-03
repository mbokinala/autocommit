#!/usr/bin/env node

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execSync, spawnSync } from "child_process";
import { z } from "zod";

import { program } from "commander";

program.name("autocommit");
program.option("--openai-api-key <key>", "OpenAI API key");
program.option("-a, --all", "add all changes to the commit");
program.parse();

const options = program.opts();

const OPENAI_API_KEY = options.openaiApiKey || process.env.OPENAI_API_KEY;

// check for OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.log(
    "No OpenAI API key found. Please set your OpenAI API key in the environment variables or pass it using --openai-api-key"
  );
  process.exit(1);
}

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;

if (options.all) {
  execSync("git add -A", { stdio: "inherit" });
}

// get the diff
const diff = execSync("git --no-pager diff --staged").toString();
if (diff.trim().length === 0) {
  console.log(
    "No staged changes to commit, exiting. Did you forget to run `git add`?"
  );
  process.exit(0);
}

async function generateCommitMessage(diff: string) {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    prompt: diff,
    schema: z.object({
      summary: z
        .string()
        .describe("A short single line summary of the changes in the diff"),
      body: z
        .string()
        .describe(
          "A more detailed description of the changes in the diff. DO NOT fill this out if the summary is sufficient to describe the changes."
        )
        .optional(),
    }),
  });

  return object;
}

async function main() {
  const commitMessage = await generateCommitMessage(diff);

  spawnSync(
    "git",
    [
      "commit",
      "-m",
      commitMessage.summary,
      ...(commitMessage.body ? ["-m", commitMessage.body] : []),
    ],
    {
      stdio: "inherit",
    }
  );
}

main();
