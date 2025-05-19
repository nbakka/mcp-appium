#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import MCPClient from "@modelcontextprotocol/sdk/client/mcp.js";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("url", {
      alias: "u",
      type: "string",
      demandOption: true,
      describe: "MCP server base URL",
    })
    .command("start_session", "Start Appium session", (yargs) => {
      yargs
        .option("platformName", { type: "string", demandOption: true })
        .option("deviceName", { type: "string", demandOption: true })
        .option("app", { type: "string" })
        .option("automationName", { type: "string" });
    })
    .command("tap <by> <value>", "Tap element", (yargs) => {
      yargs.positional("by", { type: "string" }).positional("value", { type: "string" });
    })
    .command(
      "swipe <startX> <startY> <endX> <endY> [duration]",
      "Swipe gesture",
      (yargs) => {
        yargs
          .positional("startX", { type: "number" })
          .positional("startY", { type: "number" })
          .positional("endX", { type: "number" })
          .positional("endY", { type: "number" })
          .positional("duration", { type: "number", default: 800 });
      }
    )
    .demandCommand(1, "You must provide a command")
    .help().argv;

  const client = new MCPClient(argv.url);

  try {
    const cmd = argv._[0];
    let result;

    if (cmd === "start_session") {
      const caps = {
        platformName: argv.platformName,
        deviceName: argv.deviceName,
        app: argv.app,
        automationName: argv.automationName,
      };
      result = await client.callTool("start_session", { capabilities: caps });
    } else if (cmd === "tap") {
      result = await client.callTool("tap", { by: argv.by, value: argv.value });
    } else if (cmd === "swipe") {
      result = await client.callTool("swipe", {
        startX: argv.startX,
        startY: argv.startY,
        endX: argv.endX,
        endY: argv.endY,
        duration: argv.duration,
      });
    } else {
      throw new Error(`Unknown command: ${cmd}`);
    }

    console.log(result.content.map((c) => c.text).join("\n"));
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

main();