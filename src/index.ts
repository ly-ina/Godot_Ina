#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { listScenes } from "./tools/list_scenes.js";

// Create MCP server instance
const server = new Server(
  {
    name: "godot-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ping",
        description: "Test connectivity - returns 'pong'",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_scenes",
        description: "List all .tscn scene files in a Godot project",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Godot project root (optional, defaults to current directory)",
            },
          },
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "ping") {
      return {
        content: [
          {
            type: "text",
            text: "pong",
          },
        ],
      };
    }

    if (name === "list_scenes") {
      const projectPath = (args?.project_path as string) || process.cwd();
      
      // Call the actual implementation
      const scenes = listScenes(projectPath);
      
      // Format response
      const responseText = `Found ${scenes.length} scene(s) in project:\n\n` +
        scenes.map((scene, index) => 
          `${index + 1}. ${scene.path}\n   Size: ${scene.size} bytes\n   Modified: ${scene.modified}\n`
        ).join("\n");
      
      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Godot MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
