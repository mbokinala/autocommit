#!/usr/bin/env node

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execSync, spawnSync } from "child_process";
import { z } from "zod";
import { program } from "commander";
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

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

function getOpenAIKey(): string | undefined {
  const config = readConfig();
  return config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

function getModel(): string {
  const config = readConfig();
  return config.MODEL || 'gpt-4o';
}

const configCommand = new Command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action to perform: "set" or "get"')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value (for "set" action)')
  .action((action, key, value) => {
    try {
      const config = readConfig();

      if (action === 'set' && key && value) {
        const upperKey = key.toUpperCase() as keyof Config;
        config[upperKey] = value;
        writeConfig(config);
        console.log(`Set ${upperKey} to ${value}`);
      } else if (action === 'get' && key) {
        const upperKey = key.toUpperCase() as keyof Config;
        console.log(config[upperKey] || 'Not set');
      } else {
        console.log('Invalid command. Use "config set <key> <value>" or "config get <key>"');
      }
    } catch (error) {
      console.error('Error in config command:', error);
    }
  });

program.addCommand(configCommand);

program
  .name("autocommit")
  .option("--dry-run", "Dry run (print the commit message but do not commit)")
  .option("-a, --all", "add all changes to the commit")
  .action(async (options) => {
    const OPENAI_API_KEY = getOpenAIKey();
    const MODEL = getModel();

    if (!OPENAI_API_KEY) {
      console.log(
        "No OpenAI API key found. Please set your OpenAI API key using 'autocommit config set OPENAI_API_KEY <your-api-key>'"
      );
      process.exit(1);
    }

    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });

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

    const commitMessage = await generateCommitMessage(diff, openai, MODEL);

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

program.parse();

const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`;

async function getDiff() {
  return execSync("git --no-pager diff --staged").toString();
}

async function generateCommitMessage(diff: string, openai: any, model: string) {
  const { object } = await generateObject({
    model: openai(model),
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
