// MCP Tool dispatch logic — extracted for testability
import { listScenes } from "./list_scenes.js";
import type { SceneInfo } from "./list_scenes.js";
import { readScene } from "./read_scene.js";
import type { ReadSceneResult } from "./read_scene.js";
import { createScene } from "./create_scene.js";
import { readScript } from "./read_script.js";
import { addNode } from "./add_node.js";
import { editNode } from "./edit_node.js";
import { createScript } from "./create_script.js";
import { runGodotProject } from "./run_project.js";

export interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * List all available tool definitions (for tools/list)
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "ping",
      description: "Test connectivity - returns 'pong'",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "list_scenes",
      description: "List all .tscn scene files in a Godot project",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root (optional, defaults to current directory)" },
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
          scene_path: { type: "string", description: "Path to the .tscn scene file to read" },
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
          scene_path: { type: "string", description: "Path to save the new .tscn scene file" },
          root_node_name: { type: "string", description: "Name of the root node" },
          root_node_type: { type: "string", description: "Type of the root node" },
          project_path: { type: "string", description: "Godot project root path (optional)" },
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
          script_path: { type: "string", description: "Path to the .gd script file to read" },
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
          scene_path: { type: "string", description: "Path to the .tscn scene file" },
          parent_node_name: { type: "string", description: "Name of the parent node (use '.' for root level)" },
          node_type: { type: "string", description: "Type of the new node" },
          node_name: { type: "string", description: "Name for the new node (must be unique)" },
          properties: { type: "object", description: "Optional initial properties", additionalProperties: true },
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
          scene_path: { type: "string", description: "Path to the .tscn scene file" },
          node_name: { type: "string", description: "Name of the node to edit" },
          properties: { type: "object", description: "Properties to update", additionalProperties: true },
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
          script_path: { type: "string", description: "Path to save the .gd script file" },
          content: { type: "string", description: "GDScript code content to write" },
          scene_path: { type: "string", description: "Optional: Path to .tscn scene to attach the script" },
          node_name: { type: "string", description: "Optional: Name of the node to attach" },
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
          project_path: { type: "string", description: "Path to Godot project root (must contain project.godot)" },
          mode: { type: "string", enum: ["normal", "headless", "debug"], description: "Run mode (optional)" },
          extra_args: { type: "array", items: { type: "string" }, description: "Optional extra CLI arguments" },
        },
        required: ["project_path"],
      },
    },
  ];
}

/**
 * Execute a tool by name with given arguments.
 * This is the core dispatch logic, extracted for testability.
 */
export function executeTool(name: string, args: Record<string, unknown> | undefined): ToolResponse {
  // --- ping ---
  if (name === "ping") {
    return { content: [{ type: "text", text: "pong" }] };
  }

  // --- list_scenes ---
  if (name === "list_scenes") {
    const projectPath = (args?.project_path as string) || process.cwd();
    const scenes = listScenes(projectPath);
    const text = `Found ${scenes.length} scene(s) in project:\n\n` +
      scenes.map((s: SceneInfo, i: number) => `${i + 1}. ${s.path}\n   Size: ${s.size} bytes\n   Modified: ${s.modified}\n`).join("\n");
    return { content: [{ type: "text", text }] };
  }

  // --- read_scene ---
  if (name === "read_scene") {
    const scenePath = args?.scene_path as string;
    if (!scenePath) throw new Error("Missing required parameter: scene_path");
    const result = readScene(scenePath);
    if (!result.success) throw new Error(result.error || "Failed to read scene");
    const s = result.scene!;
    const text = `Scene: ${scenePath}\n\nFormat: ${s.header.format}\nLoad Steps: ${s.header.loadSteps}\n` +
      `Node Count: ${s.nodeCount}\nRoot Node: ${s.rootNode || "(none)"}\n\nNodes:\n` +
      s.nodes.map((n: { name: string; type: string; parent: string | null }, i: number) => `${i + 1}. ${n.name} (${n.type})${n.parent ? ` - parent: ${n.parent}` : ""}`).join("\n");
    return { content: [{ type: "text", text }] };
  }

  // --- create_scene ---
  if (name === "create_scene") {
    const scenePath = args?.scene_path as string;
    const rootNodeName = args?.root_node_name as string;
    const rootNodeType = args?.root_node_type as string;
    const projectPath = args?.project_path as string | undefined;
    if (!scenePath || !rootNodeName || !rootNodeType) {
      throw new Error("Missing required parameters: scene_path, root_node_name, root_node_type");
    }
    const text = createScene({ scene_path: scenePath, root_node_name: rootNodeName, root_node_type: rootNodeType, project_path: projectPath });
    return { content: [{ type: "text", text }] };
  }

  // --- read_script ---
  if (name === "read_script") {
    const scriptPath = args?.script_path as string;
    if (!scriptPath) throw new Error("Missing required parameter: script_path");
    return { content: [{ type: "text", text: readScript({ script_path: scriptPath }) }] };
  }

  // --- add_node ---
  if (name === "add_node") {
    const scenePath = args?.scene_path as string;
    const parentName = args?.parent_node_name as string;
    const nodeType = args?.node_type as string;
    const nodeName = args?.node_name as string;
    const properties = args?.properties as Record<string, unknown> | undefined;
    if (!scenePath || !parentName || !nodeType || !nodeName) {
      throw new Error("Missing required params: scene_path, parent_node_name, node_type, node_name");
    }
    return { content: [{ type: "text", text: addNode({ scene_path: scenePath, parent_node_name: parentName, node_type: nodeType, node_name: nodeName, properties }) }] };
  }

  // --- edit_node ---
  if (name === "edit_node") {
    const scenePath = args?.scene_path as string;
    const nodeName = args?.node_name as string;
    const properties = args?.properties as Record<string, unknown>;
    if (!scenePath || !nodeName || !properties) {
      throw new Error("Missing required params: scene_path, node_name, properties");
    }
    return { content: [{ type: "text", text: editNode({ scene_path: scenePath, node_name: nodeName, properties }) }] };
  }

  // --- create_script ---
  if (name === "create_script") {
    const scriptPath = args?.script_path as string;
    const content = args?.content as string;
    if (!scriptPath || !content) throw new Error("Missing required params: script_path, content");
    return { content: [{ type: "text", text: createScript({ script_path: scriptPath, content, scene_path: args?.scene_path as string, node_name: args?.node_name as string }) }] };
  }

  // --- run_project ---
  if (name === "run_project") {
    const projectPath = args?.project_path as string;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: runGodotProject({ project_path: projectPath, mode: (args?.mode as "normal" | "headless" | "debug") || "normal", extra_args: args?.extra_args as string[] | undefined }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}
