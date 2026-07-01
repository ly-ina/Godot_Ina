#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listScenes } from "./tools/list_scenes.js";
import { readScene } from "./tools/read_scene.js";
import { createScene } from "./tools/create_scene.js";

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
      {
        name: "read_scene",
        description: "Read and parse a .tscn scene file",
        inputSchema: {
          type: "object",
          properties: {
            scene_path: {
              type: "string",
              description: "Path to the .tscn scene file to read",
            },
          },
          required: ["scene_path"],
        },
      },
      {
        name: "create_scene",
        description: "Create a new .tscn scene file with specified root node",
        inputSchema: {
          type: "object",
          properties: {
            scene_path: {
              type: "string",
              description: "Path to save the new .tscn scene file",
            },
            root_node_name: {
              type: "string",
              description: "Name of the root node (e.g., 'World', 'Main', 'Player')",
            },
            root_node_type: {
              type: "string",
              description: "Type of the root node (e.g., 'Node2D', 'Node3D', 'CharacterBody2D')",
            },
            project_path: {
              type: "string",
              description: "Godot project root path (optional, defaults to current directory)",
            },
          },
          required: ["scene_path", "root_node_name", "root_node_type"],
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

    if (name === "read_scene") {
      const scenePath = args?.scene_path as string;
      
      if (!scenePath) {
        throw new Error("Missing required parameter: scene_path");
      }
      
      // Call the actual implementation
      const result = readScene(scenePath);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to read scene");
      }
      
      // Format response
      const scene = result.scene!;
      const responseText = `Scene: ${scenePath}\n\n` +
        `Format: ${scene.header.format}\n` +
        `Load Steps: ${scene.header.loadSteps}\n` +
        `Node Count: ${scene.nodeCount}\n` +
        `Root Node: ${scene.rootNode || "(none)"}\n\n` +
        `Nodes:\n` +
        scene.nodes.map((node, index) => 
          `${index + 1}. ${node.name} (${node.type})` +
          (node.parent ? ` - parent: ${node.parent}` : "")
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

    if (name === "create_scene") {
      const scenePath = args?.scene_path as string;
      const rootNodeName = args?.root_node_name as string;
      const rootNodeType = args?.root_node_type as string;
      const projectPath = args?.project_path as string | undefined;

      if (!scenePath || !rootNodeName || !rootNodeType) {
        throw new Error("Missing required parameters: scene_path, root_node_name, root_node_type");
      }

      const result = createScene({
        scene_path: scenePath,
        root_node_name: rootNodeName,
        root_node_type: rootNodeType,
        project_path: projectPath,
      });

      return {
        content: [
          {
            type: "text",
            text: result,
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
