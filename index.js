#!/usr/bin/env node

const { execSync } = require('child_process');
const args = process.argv.slice(2);

const SYSTEM_PROMPT = `You are a helpful assistant that produces git commit messages based on the changes in a git diff.`

// get the diff
const diff = execSync('git diff').toString();


console.log(diff);