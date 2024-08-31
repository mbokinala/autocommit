#!/usr/bin/env node

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execSync } from "child_process";
import { z } from "zod";

// check for process.env.OPENAI_API_KEY
if (!process.env.OPENAI_API_KEY) {
  console.log(
    "No OpenAI API key found. Please set your OpenAI API key in the environment variables."
  );
  process.exit(1);
}

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const args = process.argv.slice(2);

const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;

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

generateCommitMessage(diff).then((commitMessage) => {
  // execute the git commit command
  execSync(
    `git commit -m "${commitMessage.summary}" -m "${commitMessage.body}"`,
    { stdio: "inherit" }
  );
});
