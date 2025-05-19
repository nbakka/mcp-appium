import { execSync } from "child_process";
import fs from "fs";

// Check if node_modules exists, else run npm install
function ensureDependencies() {
  if (!fs.existsSync("node_modules")) {
    console.log("node_modules not found, running npm install...");
    try {
      execSync("npm install", { stdio: "inherit" });
      console.log("npm install completed successfully.");
    } catch (e) {
      console.error("npm install failed:", e);
      process.exit(1);
    }
  }
}

ensureDependencies();

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const APPIUM_URL = "http://127.0.0.1:4723/wd/hub";

const server = new McpServer({ name: "MCP Appium JSONWire", version: "1.0.0" });

const state = { sessionId: null };

// Helper to extract element ID
function extractElementId(element) {
  return element.ELEMENT || element["element-6066-11e4-a52e-4f735466cecf"];
}

// Start Session tool
server.tool(
  "start_session",
  "Start Appium session with capabilities",
  {
    capabilities: z.object({
      platformName: z.string(),
      deviceName: z.string(),
      app: z.string().optional(),
      automationName: z.string().optional(),
    }),
  },
  async ({ capabilities }) => {
    try {
      const payload = {
        capabilities: {
          firstMatch: [{}],
          alwaysMatch: capabilities,
        },
      };
      const response = await axios.post(`${APPIUM_URL}/session`, payload);
      state.sessionId = response.data.sessionId;
      return { content: [{ type: "text", text: `Session started: ${state.sessionId}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error starting session: ${e.message}` }] };
    }
  }
);

// Tap tool
server.tool(
  "tap",
  "Tap element by locator",
  {
    by: z.enum(["id", "accessibility id", "xpath", "class name", "name"]),
    value: z.string(),
  },
  async ({ by, value }) => {
    if (!state.sessionId) return { content: [{ type: "text", text: "No active session" }] };
    try {
      const findResp = await axios.post(`${APPIUM_URL}/session/${state.sessionId}/element`, { using: by, value });
      const elementId = extractElementId(findResp.data.value);
      await axios.post(`${APPIUM_URL}/session/${state.sessionId}/element/${elementId}/click`);
      return { content: [{ type: "text", text: "Element tapped" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error tapping element: ${e.message}` }] };
    }
  }
);

// Swipe tool
server.tool(
  "swipe",
  "Swipe from start to end coordinates",
  {
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    duration: z.number().optional(),
  },
  async ({ startX, startY, endX, endY, duration = 800 }) => {
    if (!state.sessionId) return { content: [{ type: "text", text: "No active session" }] };
    try {
      const actions = [
        { action: "press", options: { x: startX, y: startY } },
        { action: "wait", options: { ms: duration } },
        { action: "moveTo", options: { x: endX, y: endY } },
        { action: "release", options: {} },
      ];
      await axios.post(`${APPIUM_URL}/session/${state.sessionId}/touch/perform`, { actions });
      return { content: [{ type: "text", text: `Swiped from (${startX},${startY}) to (${endX},${endY})` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error swiping: ${e.message}` }] };
    }
  }
);

// Close Session tool
server.tool(
  "close_session",
  "Close the current Appium session",
  {},
  async () => {
    if (!state.sessionId) return { content: [{ type: "text", text: "No active session" }] };
    try {
      await axios.delete(`${APPIUM_URL}/session/${state.sessionId}`);
      const oldSession = state.sessionId;
      state.sessionId = null;
      return { content: [{ type: "text", text: `Session ${oldSession} closed` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error closing session: ${e.message}` }] };
    }
  }
);

// Connect MCP server to stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
