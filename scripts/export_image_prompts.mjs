#!/usr/bin/env node
import { run } from '../src/cli.mjs';

run(['export-image-prompts', ...process.argv.slice(2)]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
