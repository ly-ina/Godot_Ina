// MCP Tool dispatch logic — 10 consolidated tools
// Previously 37 tools were split into fine-grained operations.
// Now organized by game development workflow:
//   1. init_project     — Create project skeleton
//   2. edit_scene       — CRUD scenes & nodes
//   3. edit_script      — CRUD scripts
//   4. edit_settings    — Read/write project.godot
//   5. generate_game    — Generate complete game systems
//   6. run_project      — Run/test with Godot CLI + execute GDScript
//   7. analyze_project  — Search, find refs, validate, analyze
//   8. manage_assets    — Import, delete assets
//   9. translate_project— 3.x → 4.x converter
//   10. ping            — Health check
import { initProject } from "./init_project.js";
import { editScene, type EditSceneArgs } from "./edit_scene.js";
import { editScriptFn, type EditScriptArgs } from "./script_editor.js";
import { editSettings, type EditSettingsArgs } from "./edit_settings.js";
import { generateGame, type GenerateGameArgs } from "./generate_game.js";
import { runGodotProject } from "./run_project.js";
import { executeGDScript } from "./execute_gdscript.js";
import { analyzeProjectFn, type AnalyzeArgs } from "./project_analysis.js";
import { manageAssets, type ManageAssetsArgs } from "./manage_assets.js";
import { translateProject } from "./translate_project.js";

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
 * Parse the args object from MCP JSON input.
 * Handles both `args` (direct) and `args.args` (nested) formats.
 */
function parseArgs(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== "object") return {};
  const a = args as Record<string, unknown>;
  // Some MCP clients nest args
  return (a.args && typeof a.args === "object" ? a.args : a) as Record<string, unknown>;
}

/**
 * Get the tool list for MCP tools/list response
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "init_project",
      description: "Create a standard Godot 4 project skeleton at the specified path. Creates project.godot, default directories, and basic config.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path where the project should be created" },
          project_name: { type: "string", description: "Project name (default: MyGame)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "edit_scene",
      description: "Create, read, modify, or delete scenes and their nodes. One tool replaces 8 old tools. Use `action` parameter to pick operation.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "read", "create", "add_node", "edit_node", "delete_node", "rename_node", "validate"],
            description: "Operation to perform",
          },
          project_path: { type: "string", description: "Path to Godot project root" },
          scene_path: { type: "string", description: "Path to scene file (relative, e.g. scenes/World.tscn)" },
          scene_name: { type: "string", description: "Scene/root node name (for create)" },
          scene_type: { type: "string", description: "Root node type (for create, default: Node2D)" },
          node_name: { type: "string", description: "Node name (for add/delete/rename/edit_node)" },
          node_type: { type: "string", description: "Node type (for add_node)" },
          parent_path: { type: "string", description: "Parent node path (for add_node)" },
          new_name: { type: "string", description: "New name (for rename_node)" },
          properties: { type: "string", description: "JSON string of properties (for edit_node)" },
        },
        required: ["action"],
      },
    },
    {
      name: "edit_script",
      description: "Create, read, or edit GDScript files. Also supports batch search-replace across multiple scripts.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "read", "edit", "batch"],
            description: "Operation to perform",
          },
          project_path: { type: "string", description: "Path to Godot project root" },
          script_path: { type: "string", description: "Path to script file (relative)" },
          content: { type: "string", description: "Script content (for create)" },
          extends: { type: "string", description: "Script base class (for create, default: Node)" },
          pattern: { type: "string", description: "Search text (for edit/batch)" },
          replacement: { type: "string", description: "Replacement text (for edit/batch)" },
          bind_scene: { type: "string", description: "Scene path to bind this script to (for create)" },
        },
        required: ["action"],
      },
    },
    {
      name: "edit_settings",
      description: "Read or write project.godot settings. Use `read` to get all settings, `write` to modify one.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["read", "write"], description: "Operation to perform" },
          project_path: { type: "string", description: "Path to Godot project root" },
          key: { type: "string", description: "Setting key (for write, e.g. config/name)" },
          value: { type: "string", description: "Setting value (for write)" },
          section: { type: "string", description: "Config section (for write, default: application)" },
        },
        required: ["action", "project_path"],
      },
    },
    {
      name: "generate_game",
      description: "Generate complete game systems. One-stop tool for all game content generation. Use `type` to select system, pass extra params as needed.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "component",       // 8 game components (player, enemy, collectible, etc.)
              "terrain",         // Procedural terrain (Minecraft-style)
              "behavior_tree",   // NPC with needs/personality AI
              "equipment",       // Terraria-style equipment system
              "scene_transition",// Stardew Valley-style area transitions
              "slg_map",         // Strategy map with hex grid + A* pathfinding
              "example_project", // Complete example project (4 templates)
              "character_animation", // Character body + collision + camera
              "character_demo",  // AI-driven character with procedural animation
              "sprite",          // AI-generated character portrait (dialogue use)
              "minecraft_demo",  // Complete 2D Minecraft-like playable demo
            ],
            description: "Type of game system to generate",
          },
          project_path: { type: "string", description: "Path to Godot project root" },
          name: { type: "string", description: "Name for the generated system" },
          description: { type: "string", description: "Description (for sprite generation)" },
          behavior: { type: "string", description: "AI behavior: wander|patrol|idle (for character_demo)" },
          sprite_path: { type: "string", description: "Path to sprite image (for character gen)" },
          region: { type: "string", description: 'Sprite region crop "x,y,w,h"' },
          template: { type: "string", description: "Template name (for terrain/example_project)" },
          extra: { type: "string", description: "Extra JSON parameters for complex generation" },
        },
        required: ["type", "project_path"],
      },
    },
    {
      name: "run_project",
      description: "Run a Godot project in headless mode or execute a GDScript snippet. Requires GODOT_PATH environment variable.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          mode: { type: "string", enum: ["headless", "script"], description: "Run mode: headless (run project) or script (execute single script)" },
          script: { type: "string", description: "GDScript source or file path (for script mode)" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 10000)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "analyze_project",
      description: "Search, analyze, validate, or list scenes in a Godot project. Use `action` to pick operation.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["search_nodes", "find_refs", "validate", "analyze", "list_scenes"],
            description: "Operation to perform",
          },
          project_path: { type: "string", description: "Path to Godot project root" },
          node_type: { type: "string", description: "Filter by node type (for search_nodes)" },
          node_name: { type: "string", description: "Filter by node name (for search_nodes)" },
          properties: { type: "string", description: "Property filter JSON (for search_nodes)" },
          resource_path: { type: "string", description: "Resource path to find references for (for find_refs)" },
          scene_path: { type: "string", description: "Specific scene to validate (for validate)" },
        },
        required: ["action", "project_path"],
      },
    },
    {
      name: "manage_assets",
      description: "Import external resources, delete assets/files, or list project resources.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["import", "delete_resource", "delete_file", "list"], description: "Operation to perform" },
          project_path: { type: "string", description: "Path to Godot project root" },
          source_path: { type: "string", description: "Source file path (for import)" },
          dest_path: { type: "string", description: "Destination path in project (for import)" },
          resource_path: { type: "string", description: "Resource path to delete (for delete_resource)" },
          file_path: { type: "string", description: "File path to delete (for delete_file)" },
        },
        required: ["action", "project_path"],
      },
    },
    {
      name: "translate_project",
      description: "Translate a Godot 3.x project to 4.x format. Converts scene node types and GDScript syntax.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to the Godot 3.x project to convert" },
          backup: { type: "boolean", description: "Create backup before translating (default: true)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "ping",
      description: "Health check. Returns pong if the server is running.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

/**
 * Execute a tool by name with given arguments.
 */
export function executeTool(name: string, args: unknown): ToolResponse {
  // Parse args from MCP JSON input
  const parsedArgs = parseArgs(args);
  const projectPath = parsedArgs.project_path as string | undefined;

  try {
    // --- init_project ---
    if (name === "init_project") {
      if (!projectPath) throw new Error("Missing required parameter: project_path");
      initProject({
        project_path: projectPath,
        project_name: (parsedArgs.project_name as string) || "MyGame",
      });
      return { content: [{ type: "text", text: `Project created at ${projectPath}` }] };
    }

    // --- edit_scene ---
    if (name === "edit_scene") {
      return { content: [{ type: "text", text: editScene(parsedArgs as unknown as EditSceneArgs) }] };
    }

    // --- edit_script ---
    if (name === "edit_script") {
      return { content: [{ type: "text", text: editScriptFn(parsedArgs as unknown as EditScriptArgs) }] };
    }

    // --- edit_settings ---
    if (name === "edit_settings") {
      return { content: [{ type: "text", text: editSettings(parsedArgs as unknown as EditSettingsArgs) }] };
    }

    // --- generate_game ---
    if (name === "generate_game") {
      return { content: [{ type: "text", text: generateGame(parsedArgs as unknown as GenerateGameArgs) }] };
    }

    // --- run_project ---
    if (name === "run_project") {
      if (!projectPath) throw new Error("Missing required parameter: project_path");
      const mode = (parsedArgs.mode as string) || "headless";
      if (mode === "script") {
        const script = parsedArgs.script as string;
        if (!script) throw new Error("script parameter required for script mode");
        return { content: [{ type: "text", text: executeGDScript({ project_path: projectPath, script_src: script } as any) }] };
      }
      return { content: [{ type: "text", text: runGodotProject({
        project_path: projectPath,
        mode: "headless",
        timeout: (parsedArgs.timeout as number) || 10000,
      }) }] };
    }

    // --- analyze_project ---
    if (name === "analyze_project") {
      return { content: [{ type: "text", text: analyzeProjectFn(parsedArgs as unknown as AnalyzeArgs) }] };
    }

    // --- manage_assets ---
    if (name === "manage_assets") {
      return { content: [{ type: "text", text: manageAssets(parsedArgs as unknown as ManageAssetsArgs) }] };
    }

    // --- translate_project ---
    if (name === "translate_project") {
      if (!projectPath) throw new Error("Missing required parameter: project_path");
      return { content: [{ type: "text", text: translateProject({
        project_path: projectPath,
        backup: parsedArgs.backup !== false,
      } as any) }] };
    }

    // --- ping ---
    if (name === "ping") {
      return { content: [{ type: "text", text: "pong" }] };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
}
