#!/usr/bin/env node
/**
 * Minimal MCP Server for executing AppleScript on macOS.
 * Exposes a single tool: run_applescript
 *
 * Usage: node index.js
 * Config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "applescript": {
 *         "command": "node",
 *         "args": ["/path/to/this/index.js"]
 *       }
 *     }
 *   }
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const server = new Server(
  { name: "applescript", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "run_applescript",
        description:
          "Execute an AppleScript (or JXA) script on macOS via osascript. Returns stdout. Use this to control macOS apps like DingTalk, Finder, Safari, etc.",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "The AppleScript source code to execute.",
            },
            language: {
              type: "string",
              enum: ["applescript", "javascript"],
              description:
                'Script language. Default is "applescript". Use "javascript" for JXA.',
              default: "applescript",
            },
          },
          required: ["script"],
        },
      },
      {
        name: "run_shell",
        description:
          "Execute a shell command on macOS host via /bin/sh. Use for running osascript with flags, pbcopy, pbopen, or other macOS CLI tools.",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute.",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "run_applescript") {
    const { script, language = "applescript" } = args;
    const langFlag = language === "javascript" ? "-l JavaScript" : null;

    try {
      const osascriptArgs = langFlag
        ? ["-l", "JavaScript", "-e", script]
        : ["-e", script];

      const { stdout, stderr } = await execFileAsync("osascript", osascriptArgs, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        content: [
          {
            type: "text",
            text: stdout.trim() || "(no output)",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `AppleScript error:\n${err.stderr || err.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "run_shell") {
    const { command } = args;
    try {
      const { stdout, stderr } = await execFileAsync("/bin/sh", ["-c", command], {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        content: [
          {
            type: "text",
            text: stdout.trim() || "(no output)",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Shell error:\n${err.stderr || err.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AppleScript MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
