#!/usr/bin/env node
import { run } from '../src/cli.mjs';

run(['approval-queue', ...process.argv.slice(2)]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
