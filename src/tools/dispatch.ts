// MCP Tool dispatch logic — extracted for testability
import { listScenes } from "./list_scenes.js";
import type { SceneInfo } from "./list_scenes.js";
import { readScene } from "./read_scene.js";
import { createScene } from "./create_scene.js";
import { readScript } from "./read_script.js";
import { addNode } from "./add_node.js";
import { editNode } from "./edit_node.js";
import { createScript } from "./create_script.js";
import { editScript } from "./edit_script.js";
import { deleteNode } from "./delete_node.js";
import { deleteFile } from "./delete_file.js";
import { validateScene } from "./validate_scene.js";
import { validateProject } from "./validate_project.js";
import { executeGDScript } from "./execute_gdscript.js";
import { listResources } from "./list_resources.js";
import { readProjectSettings } from "./read_project_settings.js";
import { editProjectSettings } from "./edit_project_settings.js";
import { searchNodes } from "./search_nodes.js";
import { findReferences } from "./find_references.js";
import { importResource } from "./import_resource.js";
import { deleteResource } from "./delete_resource.js";
import { renameNode } from "./rename_node.js";
import { batchEditScript } from "./batch_edit_script.js";
import { initProject } from "./init_project.js";
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
      name: "edit_script",
      description: "Modify an existing .gd GDScript file using search/replace. Specify one or more replacements, each with a 'search' string and 'replace' string. Creates an automatic backup (.bak) before making changes.",
      inputSchema: {
        type: "object",
        properties: {
          script_path: { type: "string", description: "Path to the .gd script file to modify" },
          replacements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                search: { type: "string", description: "Exact string to search for (case-sensitive)" },
                replace: { type: "string", description: "String to replace the matched text with" },
              },
              required: ["search", "replace"],
            },
            description: "Array of search/replace operations (applied in order)",
          },
          create_backup: { type: "boolean", description: "Whether to create a .bak backup before editing (default: true)" },
        },
        required: ["script_path", "replacements"],
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
    {
      name: "delete_node",
      description: "Remove a node from a .tscn scene file. By default refuses to delete nodes with children — use recursive: true to force.",
      inputSchema: {
        type: "object",
        properties: {
          scene_path: { type: "string", description: "Path to the .tscn scene file" },
          node_name: { type: "string", description: "Name of the node to delete" },
          recursive: { type: "boolean", description: "Whether to delete child nodes as well (default: false)" },
        },
        required: ["scene_path", "node_name"],
      },
    },
    {
      name: "delete_file",
      description: "Delete a Godot project file (.tscn, .gd, .import). By default moves to trash instead of permanent deletion.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Path to the file to delete" },
          use_trash: { type: "boolean", description: "Move to trash instead of permanent delete (default: true)" },
        },
        required: ["file_path"],
      },
    },
    {
      name: "validate_scene",
      description: "Validate a .tscn scene file for structural integrity — checks header, root node, duplicate names, resource references.",
      inputSchema: {
        type: "object",
        properties: {
          scene_path: { type: "string", description: "Path to the .tscn scene file" },
          project_path: { type: "string", description: "Optional project root for reference resolution" },
        },
        required: ["scene_path"],
      },
    },
    {
      name: "validate_project",
      description: "Validate an entire Godot project — checks project.godot, validates all scenes, resolves script references.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to the Godot project root" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "execute_gdscript",
      description: "Execute GDScript code via Godot CLI and return the output. Creates a temporary script file, runs it in headless mode, and captures stdout.",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "GDScript code to execute" },
          project_path: { type: "string", description: "Path to Godot project root" },
          timeout: { type: "number", description: "Optional timeout in milliseconds (default: 30000)" },
        },
        required: ["code", "project_path"],
      },
    },
    {
      name: "list_resources",
      description: "List resource files in a Godot project, optionally filtered by type (image, audio, font, scene, script).",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          type: { type: "string", enum: ["all", "image", "audio", "font", "scene", "script"], description: "Filter by resource type (default: all)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "read_project_settings",
      description: "Read and display project.godot configuration, organized by section.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "edit_project_settings",
      description: "Modify a setting in project.godot. Creates a .bak backup before saving.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          section: { type: "string", description: "Section name (e.g. application, rendering)" },
          key: { type: "string", description: "Setting key (e.g. config/name, window/size/viewport_width)" },
          value: { type: "string", description: "Value to set" },
          type: { type: "string", enum: ["string", "int", "float", "bool"], description: "Optional type hint" },
        },
        required: ["project_path", "section", "key", "value"],
      },
    },
    {
      name: "search_nodes",
      description: "Search for nodes across all scene files by type, name, or property.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          node_type: { type: "string", description: "Filter by node type (e.g. CharacterBody2D)" },
          name_contains: { type: "string", description: "Filter by name (substring match)" },
          has_property: { type: "string", description: "Filter by property name" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "find_references",
      description: "Find where a resource or script is referenced across all scenes in a project.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          resource_path: { type: "string", description: "Resource path to search for (e.g. res://player.gd)" },
        },
        required: ["project_path", "resource_path"],
      },
    },
    {
      name: "import_resource",
      description: "Import an external resource file (image, audio, font, 3D model, scene, script) into the Godot project.",
      inputSchema: {
        type: "object",
        properties: {
          source_path: { type: "string", description: "Source file path to import from" },
          dest_path: { type: "string", description: "Destination path inside the project" },
          mkdir: { type: "boolean", description: "Create subdirectories if needed (default: true)" },
        },
        required: ["source_path", "dest_path"],
      },
    },
    {
      name: "delete_resource",
      description: "Delete a resource file with safety checks. Scans all scenes for references before deleting.",
      inputSchema: {
        type: "object",
        properties: {
          resource_path: { type: "string", description: "Path to the resource file to delete" },
          project_path: { type: "string", description: "Godot project root (for reference checking)" },
          force: { type: "boolean", description: "Skip reference check and force delete (default: false)" },
          use_trash: { type: "boolean", description: "Move to trash instead of permanent delete (default: true)" },
        },
        required: ["resource_path", "project_path"],
      },
    },
    {
      name: "rename_node",
      description: "Rename a node in a .tscn scene. Optionally updates child parent references and connection references.",
      inputSchema: {
        type: "object",
        properties: {
          scene_path: { type: "string", description: "Path to the .tscn scene file" },
          old_name: { type: "string", description: "Current name of the node" },
          new_name: { type: "string", description: "New name for the node" },
          update_parent_refs: { type: "boolean", description: "Update child node parent references (default: true)" },
          update_connections: { type: "boolean", description: "Update connection references (default: true)" },
        },
        required: ["scene_path", "old_name", "new_name"],
      },
    },
    {
      name: "batch_edit_script",
      description: "Search and replace text across multiple files (scripts, scenes, or both) in a Godot project. Creates backups automatically.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          search: { type: "string", description: "String to search for" },
          replace: { type: "string", description: "String to replace with" },
          file_type: { type: "string", enum: ["gd", "tscn", "all"], description: "File type to process (default: gd)" },
          create_backup: { type: "boolean", description: "Create .bak backups (default: true)" },
        },
        required: ["project_path", "search", "replace"],
      },
    },
    {
      name: "init_project",
      description: "Create a new Godot 4.x project with standard directory structure, project.godot config, and an empty main scene.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path where the project should be created" },
          project_name: { type: "string", description: "Project name (defaults to directory name)" },
          width: { type: "number", description: "Viewport width (default: 1152)" },
          height: { type: "number", description: "Viewport height (default: 648)" },
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

  // --- edit_script ---
  if (name === "edit_script") {
    const scriptPath = args?.script_path as string;
    const replacements = args?.replacements as Array<{ search: string; replace: string; }>;
    const createBackup = args?.create_backup as boolean | undefined;
    if (!scriptPath || !replacements) throw new Error("Missing required params: script_path, replacements");
    return { content: [{ type: "text", text: editScript({ script_path: scriptPath, replacements, create_backup: createBackup }) }] };
  }

  // --- delete_node ---
  if (name === "delete_node") {
    const scenePath = args?.scene_path as string;
    const nodeName = args?.node_name as string;
    const recursive = args?.recursive as boolean | undefined;
    if (!scenePath || !nodeName) throw new Error("Missing required params: scene_path, node_name");
    return { content: [{ type: "text", text: deleteNode({ scene_path: scenePath, node_name: nodeName, recursive }) }] };
  }

  // --- delete_file ---
  if (name === "delete_file") {
    const filePath = args?.file_path as string;
    const useTrash = args?.use_trash as boolean | undefined;
    if (!filePath) throw new Error("Missing required parameter: file_path");
    return { content: [{ type: "text", text: deleteFile({ file_path: filePath, use_trash: useTrash }) }] };
  }

  // --- validate_scene ---
  if (name === "validate_scene") {
    const scenePath = args?.scene_path as string;
    const projectPath = args?.project_path as string | undefined;
    if (!scenePath) throw new Error("Missing required parameter: scene_path");
    return { content: [{ type: "text", text: validateScene({ scene_path: scenePath, project_path: projectPath }) }] };
  }

  // --- validate_project ---
  if (name === "validate_project") {
    const projectPath = args?.project_path as string;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: validateProject({ project_path: projectPath }) }] };
  }

  // --- execute_gdscript ---
  if (name === "execute_gdscript") {
    const code = args?.code as string;
    const projectPath = args?.project_path as string;
    const timeout = args?.timeout as number | undefined;
    if (!code || !projectPath) throw new Error("Missing required params: code, project_path");
    return { content: [{ type: "text", text: executeGDScript({ code, project_path: projectPath, timeout }) }] };
  }

  // --- list_resources ---
  if (name === "list_resources") {
    const projectPath = args?.project_path as string;
    const type = args?.type as string | undefined;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: listResources({ project_path: projectPath, type: type as "all" | "image" | "audio" | "font" | "scene" | "script" | undefined }) }] };
  }

  // --- read_project_settings ---
  if (name === "read_project_settings") {
    const projectPath = args?.project_path as string;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: readProjectSettings({ project_path: projectPath }) }] };
  }

  // --- edit_project_settings ---
  if (name === "edit_project_settings") {
    const projectPath = args?.project_path as string;
    const section = args?.section as string;
    const key = args?.key as string;
    const value = args?.value as string;
    const type = args?.type as "string" | "int" | "float" | "bool" | undefined;
    if (!projectPath || !section || !key || value === undefined) {
      throw new Error("Missing required params: project_path, section, key, value");
    }
    return { content: [{ type: "text", text: editProjectSettings({ project_path: projectPath, section, key, value, type }) }] };
  }

  // --- search_nodes ---
  if (name === "search_nodes") {
    const projectPath = args?.project_path as string;
    const nodeType = args?.node_type as string | undefined;
    const nameContains = args?.name_contains as string | undefined;
    const hasProperty = args?.has_property as string | undefined;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: searchNodes({ project_path: projectPath, node_type: nodeType, name_contains: nameContains, has_property: hasProperty }) }] };
  }

  // --- find_references ---
  if (name === "find_references") {
    const projectPath = args?.project_path as string;
    const resourcePath = args?.resource_path as string;
    if (!projectPath || !resourcePath) throw new Error("Missing required params: project_path, resource_path");
    return { content: [{ type: "text", text: findReferences({ project_path: projectPath, resource_path: resourcePath }) }] };
  }

  // --- import_resource ---
  if (name === "import_resource") {
    const sourcePath = args?.source_path as string;
    const destPath = args?.dest_path as string;
    const mkdir = args?.mkdir as boolean | undefined;
    if (!sourcePath || !destPath) throw new Error("Missing required params: source_path, dest_path");
    return { content: [{ type: "text", text: importResource({ source_path: sourcePath, dest_path: destPath, mkdir }) }] };
  }

  // --- delete_resource ---
  if (name === "delete_resource") {
    const resourcePath = args?.resource_path as string;
    const projectPath = args?.project_path as string;
    const force = args?.force as boolean | undefined;
    const useTrash = args?.use_trash as boolean | undefined;
    if (!resourcePath || !projectPath) throw new Error("Missing required params: resource_path, project_path");
    return { content: [{ type: "text", text: deleteResource({ resource_path: resourcePath, project_path: projectPath, force, use_trash: useTrash }) }] };
  }

  // --- rename_node ---
  if (name === "rename_node") {
    const scenePath = args?.scene_path as string;
    const oldName = args?.old_name as string;
    const newName = args?.new_name as string;
    const updateParentRefs = args?.update_parent_refs as boolean | undefined;
    const updateConnections = args?.update_connections as boolean | undefined;
    if (!scenePath || !oldName || !newName) throw new Error("Missing required params: scene_path, old_name, new_name");
    return { content: [{ type: "text", text: renameNode({ scene_path: scenePath, old_name: oldName, new_name: newName, update_parent_refs: updateParentRefs, update_connections: updateConnections }) }] };
  }

  // --- batch_edit_script ---
  if (name === "batch_edit_script") {
    const projectPath = args?.project_path as string;
    const search = args?.search as string;
    const replace = args?.replace as string;
    const fileType = args?.file_type as "gd" | "tscn" | "all" | undefined;
    const createBackup = args?.create_backup as boolean | undefined;
    if (!projectPath || search === undefined || replace === undefined) {
      throw new Error("Missing required params: project_path, search, replace");
    }
    return { content: [{ type: "text", text: batchEditScript({ project_path: projectPath, search, replace, file_type: fileType, create_backup: createBackup }) }] };
  }

  // --- init_project ---
  if (name === "init_project") {
    const projectPath = args?.project_path as string;
    const projectName = args?.project_name as string | undefined;
    const width = args?.width as number | undefined;
    const height = args?.height as number | undefined;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: initProject({ project_path: projectPath, project_name: projectName, width, height }) }] };
  }

  // --- run_project ---
  if (name === "run_project") {
    const projectPath = args?.project_path as string;
    if (!projectPath) throw new Error("Missing required parameter: project_path");
    return { content: [{ type: "text", text: runGodotProject({ project_path: projectPath, mode: (args?.mode as "normal" | "headless" | "debug") || "normal", extra_args: args?.extra_args as string[] | undefined }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}
