#!/usr/bin/env node
// Godot MCP Server — dual mode: MCP server (default) or CLI (--cli flag)
// CLI mode:  node dist/index.js --cli <tool_name> '<json_args>'
// MCP mode:  runs as stdio-based MCP server for Claude/WorkBuddy

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getToolDefinitions, executeTool } from "./tools/dispatch.js";

// ── CLI MODE ──
const args = process.argv.slice(2);
const cliIndex = args.indexOf("--cli");
if (cliIndex !== -1) {
  const toolName = args[cliIndex + 1];
  const toolArgs = args[cliIndex + 2] ? tryParse(args[cliIndex + 2]) : {};

  if (toolName === "help" || toolName === "--help") {
    const tools = getToolDefinitions();
    console.log("Godot MCP Server — CLI mode");
    console.log("");
    for (const t of tools) {
      const params = t.inputSchema?.properties
        ? Object.entries(t.inputSchema.properties as Record<string, { type: string; description?: string }>)
            .map(([k, v]) => `  ${k}: ${v.type}${v.description ? " — " + v.description : ""}`)
            .join("\n")
        : "";
      console.log(`${t.name}`);
      console.log(`  ${t.description || ""}`);
      if (params) console.log(params);
      console.log("");
    }
    process.exit(0);
  }

  if (!toolName) {
    console.error("Usage: node dist/index.js --cli <tool_name> '<json_args>'");
    console.error("       node dist/index.js --cli help");
    process.exit(1);
  }

  try {
    const result = executeTool(toolName, toolArgs);
    const text = result.content?.[0]?.text || "";
    console.log(text);
    if (result.isError) process.exit(1);
  } catch (e: unknown) {
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  process.exit(0);
}

// ── MCP SERVER MODE ──
const server = new Server(
  { name: "godot-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getToolDefinitions(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = executeTool(name, args as Record<string, unknown> | undefined);
    return result as unknown as Record<string, unknown>;
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Godot MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

// ── Utilities ──
function tryParse(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return {};
  }
}
