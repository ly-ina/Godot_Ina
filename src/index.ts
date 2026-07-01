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
import { readScript } from "./tools/read_script.js";
import { addNode } from "./tools/add_node.js";
import { editNode } from "./tools/edit_node.js";
import { createScript } from "./tools/create_script.js";
import { runGodotProject } from "./tools/run_project.js";

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
      {
        name: "read_script",
        description: "Read a .gd GDScript file and return its content",
        inputSchema: {
          type: "object",
          properties: {
            script_path: {
              type: "string",
              description: "Path to the .gd script file to read",
            },
          },
          required: ["script_path"],
        },
      },
      {
        name: "add_node",
        description: "Add a new node to an existing .tscn scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_path: {
              type: "string",
              description: "Path to the .tscn scene file",
            },
            parent_node_name: {
              type: "string",
              description: "Name of the parent node (use '.' for root level)",
            },
            node_type: {
              type: "string",
              description: "Type of the new node (e.g., 'Sprite2D', 'CharacterBody2D', 'Camera2D')",
            },
            node_name: {
              type: "string",
              description: "Name for the new node (must be unique in the scene)",
            },
            properties: {
              type: "object",
              description: "Optional initial properties for the new node (key-value pairs)",
              additionalProperties: true,
            },
          },
          required: ["scene_path", "parent_node_name", "node_type", "node_name"],
        },
      },
      {
        name: "edit_node",
        description: "Modify properties of a node in a .tscn scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_path: {
              type: "string",
              description: "Path to the .tscn scene file",
            },
            node_name: {
              type: "string",
              description: "Name of the node to edit",
            },
            properties: {
              type: "object",
              description: "Properties to update. Set a property to null to remove it.",
              additionalProperties: true,
            },
          },
          required: ["scene_path", "node_name", "properties"],
        },
      },
      {
        name: "create_script",
        description: "Create a new .gd GDScript file, optionally attaching it to a scene node",
        inputSchema: {
          type: "object",
          properties: {
            script_path: {
              type: "string",
              description: "Path to save the .gd script file",
            },
            content: {
              type: "string",
              description: "GDScript code content to write",
            },
            scene_path: {
              type: "string",
              description: "Optional: Path to .tscn scene to attach the script",
            },
            node_name: {
              type: "string",
              description: "Optional: Name of the node to attach the script (requires scene_path)",
            },
          },
          required: ["script_path", "content"],
        },
      },
      {
        name: "run_project",
        description: "Run a Godot project using the Godot CLI (detects Godot executable automatically)",
        inputSchema: {
          type: "object",
          properties: {
            project_path: {
              type: "string",
              description: "Path to Godot project root (must contain project.godot)",
            },
            mode: {
              type: "string",
              description: "Run mode (optional): 'normal' (default), 'headless', or 'debug'",
              enum: ["normal", "headless", "debug"],
            },
            extra_args: {
              type: "array",
              items: { type: "string" },
              description: "Optional extra CLI arguments to pass to Godot",
            },
          },
          required: ["project_path"],
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

    if (name === "read_script") {
      const scriptPath = args?.script_path as string;
      if (!scriptPath) {
        throw new Error("Missing required parameter: script_path");
      }
      const result = readScript({ script_path: scriptPath });
      return {
        content: [{ type: "text", text: result }],
      };
    }

    if (name === "add_node") {
      const scenePath = args?.scene_path as string;
      const parentName = args?.parent_node_name as string;
      const nodeType = args?.node_type as string;
      const nodeName = args?.node_name as string;
      const properties = args?.properties as Record<string, unknown> | undefined;

      if (!scenePath || !parentName || !nodeType || !nodeName) {
        throw new Error("Missing required parameters: scene_path, parent_node_name, node_type, node_name");
      }

      const result = addNode({
        scene_path: scenePath,
        parent_node_name: parentName,
        node_type: nodeType,
        node_name: nodeName,
        properties,
      });
      return {
        content: [{ type: "text", text: result }],
      };
    }

    if (name === "edit_node") {
      const scenePath = args?.scene_path as string;
      const nodeName = args?.node_name as string;
      const properties = args?.properties as Record<string, unknown>;

      if (!scenePath || !nodeName || !properties) {
        throw new Error("Missing required parameters: scene_path, node_name, properties");
      }

      const result = editNode({
        scene_path: scenePath,
        node_name: nodeName,
        properties,
      });
      return {
        content: [{ type: "text", text: result }],
      };
    }

    if (name === "create_script") {
      const scriptPath = args?.script_path as string;
      const content = args?.content as string;
      const scenePath = args?.scene_path as string | undefined;
      const nodeName = args?.node_name as string | undefined;

      if (!scriptPath || !content) {
        throw new Error("Missing required parameters: script_path, content");
      }

      const result = createScript({
        script_path: scriptPath,
        content,
        scene_path: scenePath,
        node_name: nodeName,
      });
      return {
        content: [{ type: "text", text: result }],
      };
    }

    if (name === "run_project") {
      const projectPath = args?.project_path as string;
      const mode = args?.mode as "normal" | "headless" | "debug" | undefined;
      const extraArgs = args?.extra_args as string[] | undefined;

      if (!projectPath) {
        throw new Error("Missing required parameter: project_path");
      }

      const result = runGodotProject({
        project_path: projectPath,
        mode: mode || "normal",
        extra_args: extraArgs,
      });
      return {
        content: [{ type: "text", text: result }],
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
