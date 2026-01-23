#!/usr/bin/env node

import { runCLI } from "../dist/cli.js";

runCLI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
