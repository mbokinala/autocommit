#!/usr/bin/env node

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execSync, spawnSync } from "child_process";
import { z } from "zod";
import { program } from "commander";
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '', '.autocommit');

interface Config {
  OPENAI_API_KEY?: string;
  MODEL?: string;
}

function readConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(config: Config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

program
  .name("autocommit")
  .option("--dry-run", "Dry run (print the commit message but do not commit)")
  .option("-a, --all", "add all changes to the commit")
  .action(async (options) => {
    // This is the default action when no subcommand is specified
    const config = readConfig();
    const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const MODEL = config.MODEL || 'gpt-4o';

    if (!OPENAI_API_KEY) {
      console.log(
        "No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'"
      );
      process.exit(1);
    }

    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // ... existing main function code ...
    if (options.all) {
      execSync("git add -A", { stdio: "inherit" });
    }

    const diff = await getDiff();
    if (diff.trim().length === 0) {
      console.log(
        "No staged changes to commit, exiting. Re-run with -a to commit all changes or manually add the changes you want to commit with git add <file>."
      );
      process.exit(1);
    }

    const commitMessage = await generateCommitMessage(diff);

    if (options.dryRun) {
      console.log(commitMessage);
      return;
    }

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
  });

program
  .command('config')
  .description('Manage configuration')
  .option('set <key> <value>', 'Set a configuration value')
  .option('get <key>', 'Get a configuration value')
  .action((options) => {
    const config = readConfig();
    if (options.set) {
      config[options.set[0] as keyof Config] = options.set[1];
      writeConfig(config);
      console.log(`Set ${options.set[0]} to ${options.set[1]}`);
    } else if (options.get) {
      console.log(config[options.get as keyof Config] || 'Not set');
    }
  });

program.parse();

const options = program.opts();
const config = readConfig();

const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const MODEL = config.MODEL || 'gpt-4o';

// check for OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.log(
    "No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'"
  );
  process.exit(1);
}

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;

async function getDiff() {
  // get the diff
  return execSync("git --no-pager diff --staged").toString();
}

async function generateCommitMessage(diff: string) {
  const config = readConfig();
  const OPENAI_API_KEY = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const MODEL = config.MODEL || 'gpt-4o';

  const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const { object } = await generateObject({
    model: openai(MODEL),
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
  if (options.all) {
    execSync("git add -A", { stdio: "inherit" });
  }

  const diff = await getDiff();
  if (diff.trim().length === 0) {
    console.log(
      "No staged changes to commit, exiting. Re-run with -a to commit all changes or manually add the changes you want to commit with git add <file>."
    );
    process.exit(1);
  }

  const commitMessage = await generateCommitMessage(diff);

  if (options.dryRun) {
    console.log(commitMessage);
    return;
  }

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

// Check if it's a config command
if (!process.argv.slice(2).includes('config')) {
  main();
}
