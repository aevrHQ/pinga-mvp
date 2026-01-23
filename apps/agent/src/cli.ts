import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { Argv } from "yargs";
import { randomBytes } from "crypto";
import * as fsSync from "fs";
import * as pathLib from "path";

import type { DevFlowConfig } from "./config.js";
import {
  createDefaultConfig,
  saveConfig,
  validateConfig,
  loadConfig,
} from "./config.js";
import { initiateOAuthFlow, getTokenExpiration } from "./auth/oauth.js";
import { PlatformClient, type CommandRequest } from "./agent/client.js";

// ===== INIT COMMAND =====

interface InitOptions {
  name?: string;
  platformUrl?: string;
}

async function initCommand(options: InitOptions): Promise<void> {
  console.log("\n🚀 DevFlow Agent Initialization\n");

  const platformUrl = options.platformUrl || "https://devflow.example.com";

  console.log("📍 Platform URL:", platformUrl);
  console.log("⏳ Starting authentication flow...\n");

  try {
    // Initiate OAuth
    const token = await initiateOAuthFlow({
      platformUrl,
      clientId: "devflow-agent-cli",
      redirectUri: "http://localhost:3333/callback",
    });

    console.log("✓ Authentication successful!");
    // Token has agent_id not agentId
    const agentId = (token as any).agent_id || (token as any).agentId;
    console.log(`✓ Agent ID: ${agentId}`);

    // Generate default agent name
    const agentName = options.name || `agent-${randomBytes(4).toString("hex")}`;

    // Create and save config
    const config = createDefaultConfig(
      platformUrl,
      token.access_token,
      agentId,
      agentName
    );

    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error("❌ Configuration validation failed:");
      validation.errors.forEach((err: string) => console.error(`  - ${err}`));
      process.exit(1);
    }

    saveConfig(config);

    console.log("\n✅ Configuration complete!\n");
    console.log("📋 Configuration Summary:");
    console.log(`   Agent: ${agentName}`);
    console.log(`   Platform: ${platformUrl}`);
    console.log(`   Config Location: ~/.devflow/config.json\n`);
    console.log("🚀 Next Step:");
    console.log(`   devflow-agent start\n`);
  } catch (error) {
    console.error(
      `\n❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// ===== START COMMAND =====

interface StartOptions {
  pollInterval: number;
  debug: boolean;
}

async function startCommand(options: StartOptions): Promise<void> {
  console.log("\n🚀 DevFlow Agent Starting\n");

  const config = loadConfig();
  if (!config) {
    console.log("❌ No agent configured. Run 'devflow-agent init' first.");
    process.exit(1);
  }

  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("❌ Configuration invalid:");
    validation.errors.forEach((err: string) => console.error(`  - ${err}`));
    process.exit(1);
  }

  if (options.debug) {
    console.log("📋 Debug Configuration:");
    console.log(`   Agent: ${config.agent.name}`);
    console.log(`   Platform: ${config.platform.url}`);
    console.log(`   Poll Interval: ${options.pollInterval}ms\n`);
  }

  // Initialize platform client
  const client = new PlatformClient(
    config.platform.url,
    config.agent.id,
    config.platform.api_key
  );

  // Graceful shutdown
  let running = true;
  process.on("SIGINT", () => {
    console.log("\n\n✓ Agent shutdown requested");
    running = false;
    setTimeout(() => process.exit(0), 1000);
  });

  // Register agent
  try {
    console.log("📡 Registering agent...");
    await client.register();
    console.log(`✓ Agent registered: ${config.agent.id}`);
    console.log(`✓ Listening for commands...\n`);
  } catch (error) {
    console.error(`❌ Registration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Main polling loop
  let lastHeartbeat = 0;
  while (running) {
    try {
      // Heartbeat every 30 seconds
      if (Date.now() - lastHeartbeat > 30000) {
        await client.heartbeat();
        lastHeartbeat = Date.now();
      }

      // Poll for commands
      const commands = await client.getCommands();

      if (commands.length > 0) {
        if (options.debug) {
          console.log(`📨 Received ${commands.length} command(s)`);
        }

        commands.forEach((cmd: CommandRequest) => {
          console.log(`\n⚡ Executing: ${cmd.intent}`);
          console.log(`   Task ID: ${cmd.task_id}`);

          // Send progress update
          client.reportProgress(cmd.task_id, {
            status: "in_progress",
            step: cmd.intent,
            progress: 0.25,
          });

          // Execute task via agent-host (Copilot SDK)
          (async () => {
            try {
              // Get agent-host URL from environment
              const agentHostUrl = process.env.AGENT_HOST_URL || "http://localhost:3001";

              // Call agent-host to execute the workflow
              const response = await fetch(`${agentHostUrl}/api/workflows/execute`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: cmd.task_id,
                  intent: cmd.intent,
                  repo: cmd.repo,
                  branch: cmd.branch,
                  naturalLanguage: cmd.description,
                }),
              });

              if (!response.ok) {
                throw new Error(`Agent-host error: ${response.statusText}`);
              }

              // Report completion
              await client.completeTask(cmd.task_id, {
                success: true,
              });

              console.log(`✓ Task completed: ${cmd.task_id}`);
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              await client.failTask(cmd.task_id, errorMsg);
              console.error(`✗ Task failed: ${cmd.task_id} - ${errorMsg}`);
            }
          })();
        });
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollInterval)
      );
    } catch (error) {
      console.error(`⚠ Poll error: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollInterval * 2)
      );
    }
  }
}

// ===== CLI ROUTER =====

export async function runCLI(): Promise<void> {
  await yargs(hideBin(process.argv))
    .command(
      "init",
      "Initialize DevFlow Agent (requires authentication)",
      (y: Argv) =>
        y
          .option("name", {
            alias: "n",
            describe: "Agent name",
            type: "string",
          })
          .option("platform-url", {
            alias: "p",
            describe: "Platform URL",
            type: "string",
            default: "https://devflow.example.com",
          }),
      (argv: any) =>
        initCommand({
          name: argv.name,
          platformUrl: argv["platform-url"],
        })
    )
    .command(
      "start",
      "Start DevFlow Agent (polls for commands)",
      (y: Argv) =>
        y
          .option("poll-interval", {
            alias: "i",
            describe: "Polling interval in milliseconds",
            type: "number",
            default: 5000,
          })
          .option("debug", {
            alias: "d",
            describe: "Enable debug logging",
            type: "boolean",
            default: false,
          }),
      (argv: any) =>
        startCommand({
          pollInterval: argv["poll-interval"],
          debug: argv.debug,
        })
    )
    .command(
      "status",
      "Show agent status",
      async () => {
        const config = loadConfig();
        if (!config) {
          console.log("❌ No agent configured. Run 'devflow-agent init' first.");
          process.exit(1);
        }
        console.log("\n✓ DevFlow Agent Status\n");
        console.log(`  Agent: ${config.agent.name}`);
        console.log(`  ID: ${config.agent.id}`);
        console.log(`  Platform: ${config.platform.url}`);
        console.log(`  Config: ~/.devflow/config.json\n`);
      }
    )
    .option("version", {
      alias: "v",
      describe: "Show version",
      type: "boolean",
    })
    .option("help", {
      alias: "h",
      describe: "Show help",
      type: "boolean",
    })
    .epilogue(
      `
Examples:
  devflow-agent init
  devflow-agent start
  devflow-agent status
  devflow-agent start --debug
`
    )
    .demandCommand(1, "Please specify a command")
    .strict()
    .parse();
}
