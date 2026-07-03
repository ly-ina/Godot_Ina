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
import { generateTemplate, type GenerateTemplateArgs } from "./generate_template.js";
import { generateScene3D, type GenerateScene3DArgs } from "./generate_scene_3d.js";
import { fetchAsset, type FetchAssetArgs } from "./fetch_asset.js";
import { translateProject } from "./translate_project.js";
import { validateScene } from "./validate_scene.js";
import { cnError } from "./error-messages.js";
import { searchCode, type SearchCodeArgs } from "./search_code.js";
import { analyzeDeps, type AnalyzeDepsArgs } from "./analyze_deps.js";
import { batchEdit, type BatchEditArgs } from "./batch_edit.js";
import { launchEditor, type LaunchEditorArgs } from "./launch_editor.js";
import { generateSpriteSheet, type GenerateSpriteSheetArgs } from "./generate_sprite_sheet.js";

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
      name: "generate_template",
      description: "Generate a complete single-scene game template: platformer2d, rpg_topdown, topdown_shooter, or strategy_slg. Drops a ready-to-run .tscn into your project.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          template: { type: "string", enum: ["platformer2d", "rpg_topdown", "topdown_shooter", "strategy_slg"], description: "Template type" },
          name: { type: "string", description: "Output scene name (default: template name)" },
        },
        required: ["project_path", "template"],
      },
    },
    {
      name: "generate_scene_3d",
      description: "Generate a basic 3D scene with ground, player controller (FPS or TPS), lighting, and collision. WASD move, Space jump, mouse look.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          name: { type: "string", description: "Scene name (default: Scene3D)" },
          camera: { type: "string", enum: ["fps", "tps"], description: "Camera mode: fps (first person) or tps (third person, default)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "fetch_asset",
      description: "Search and download assets from the Godot Asset Library or direct URLs. Supports sprites, audio, models, scripts, addons.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Path to Godot project root" },
          query: { type: "string", description: "Search query or direct download URL" },
          type: { type: "string", description: "Asset type hint: sprites, audio, models, scripts, templates, addons" },
          limit: { type: "number", description: "Max search results (default: 5)" },
        },
        required: ["project_path", "query"],
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
    {
      name: "search_code",
      description: "Search GDScript text across the project. Supports plain text and regex search.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Godot project root path" },
          pattern: { type: "string", description: "Search pattern (plain text or regex)" },
          regex: { type: "boolean", description: "Treat pattern as regex (default: false)" },
          ignore_case: { type: "boolean", description: "Case insensitive (default: false)" },
          glob: { type: "string", description: "File pattern (default: **/*.gd)" },
          max_results: { type: "number", description: "Max results (default: 50)" },
        },
        required: ["project_path", "pattern"],
      },
    },
    {
      name: "analyze_deps",
      description: "Analyze cross-file dependencies: find what references a resource, or list a scene's dependencies.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Godot project root path" },
          resource_path: { type: "string", description: "Resource path to find references for (e.g. res://assets/player.png)" },
          mode: { type: "string", enum: ["find_refs", "deps_of"], description: "find_refs (default): what references this resource? deps_of: what does this scene depend on?" },
          scene_path: { type: "string", description: "Scene path (for deps_of mode)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "batch_edit",
      description: "Batch operations across multiple files: replace text, replace node types, add properties, or list matching files.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Godot project root path" },
          action: { type: "string", enum: ["list_files", "replace_text", "replace_node_type", "add_property"], description: "Operation type" },
          glob: { type: "string", description: "File pattern (default: **/*.gd)" },
          pattern: { type: "string", description: "Search pattern (for replace_text)" },
          replacement: { type: "string", description: "Replacement text (for replace_text)" },
          old_type: { type: "string", description: "Old node type (for replace_node_type)" },
          new_type: { type: "string", description: "New node type (for replace_node_type)" },
          property: { type: "string", description: "Property name (for add_property)" },
          value: { type: "string", description: "Property value (for add_property)" },
          dry_run: { type: "boolean", description: "Preview only — don't modify (default: false)" },
        },
        required: ["project_path", "action"],
      },
    },
    {
      name: "launch_editor",
      description: "Open Godot editor for manual visual editing with task-specific tutorial (ui_layout/animation/tileset/material/signal/collision/lighting/general). AI handles code, human handles visuals.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Godot project root path" },
          scene_path: { type: "string", description: "Scene/resource to open (optional)" },
          mode: { type: "string", enum: ["ui_layout", "animation", "tileset", "material", "signal", "collision", "lighting", "general"], description: "Editing mode — determines the tutorial shown (default: general)" },
          context: { type: "string", description: "What the AI just generated and why manual edit is needed" },
          timeout: { type: "number", description: "Max wait in seconds (default: 600, 0 = infinite)" },
          detach: { type: "boolean", description: "Don't wait — just open and return immediately (default: false)" },
        },
        required: ["project_path"],
      },
    },
    {
      name: "generate_sprite_sheet",
      description: "Generate multi-frame 2D character sprite sheets via AI Game Workbench (github.com/kazusa000/ai_game_workbench). Creates SpriteFrames .tres + AnimatedSprite2D scene for Godot.",
      inputSchema: {
        type: "object",
        properties: {
          project_path: { type: "string", description: "Godot project root path" },
          name: { type: "string", description: "Character name" },
          workbench_url: { type: "string", description: "AI Game Workbench URL (default: http://127.0.0.1:8787)" },
          character_id: { type: "string", description: "Existing Workbench character ID (optional)" },
          export_size: { type: "number", description: "Export frame size in px (256/384/512/1024, default: 512)" },
        },
        required: ["project_path", "name"],
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

    // --- generate_template ---
    if (name === "generate_template") {
      return { content: [{ type: "text", text: generateTemplate(parsedArgs as unknown as GenerateTemplateArgs) }] };
    }

    // --- generate_scene_3d ---
    if (name === "generate_scene_3d") {
      return { content: [{ type: "text", text: generateScene3D(parsedArgs as unknown as GenerateScene3DArgs) }] };
    }

    // --- fetch_asset ---
    if (name === "fetch_asset") {
      return { content: [{ type: "text", text: fetchAsset(parsedArgs as unknown as FetchAssetArgs) }] };
    }

    // --- ping ---
    if (name === "ping") {
      return { content: [{ type: "text", text: "pong" }] };
    }

    // --- search_code ---
    if (name === "search_code") {
      return {
        content: [{ type: "text", text: searchCode({
          project_path: parsedArgs.project_path as string,
          pattern: parsedArgs.pattern as string,
          regex: parsedArgs.regex as boolean | undefined,
          ignore_case: parsedArgs.ignore_case as boolean | undefined,
          glob: parsedArgs.glob as string | undefined,
          max_results: parsedArgs.max_results as number | undefined,
        }) }],
      };
    }

    // --- analyze_deps ---
    if (name === "analyze_deps") {
      return {
        content: [{ type: "text", text: analyzeDeps({
          project_path: parsedArgs.project_path as string,
          resource_path: parsedArgs.resource_path as string | undefined,
          mode: parsedArgs.mode as "find_refs" | "deps_of" | undefined,
          scene_path: parsedArgs.scene_path as string | undefined,
        }) }],
      };
    }

    // --- batch_edit ---
    if (name === "batch_edit") {
      return {
        content: [{ type: "text", text: batchEdit({
          project_path: parsedArgs.project_path as string,
          action: parsedArgs.action as BatchEditArgs["action"],
          glob: parsedArgs.glob as string | undefined,
          pattern: parsedArgs.pattern as string | undefined,
          replacement: parsedArgs.replacement as string | undefined,
          old_type: parsedArgs.old_type as string | undefined,
          new_type: parsedArgs.new_type as string | undefined,
          property: parsedArgs.property as string | undefined,
          value: parsedArgs.value as string | undefined,
          dry_run: parsedArgs.dry_run as boolean | undefined,
        }) }],
      };
    }

    // --- launch_editor ---
    if (name === "launch_editor") {
      return {
        content: [{ type: "text", text: launchEditor({
          project_path: parsedArgs.project_path as string,
          scene_path: parsedArgs.scene_path as string | undefined,
          mode: parsedArgs.mode as LaunchEditorArgs["mode"],
          context: parsedArgs.context as string | undefined,
          timeout: parsedArgs.timeout as number | undefined,
          detach: parsedArgs.detach as boolean | undefined,
        }) }],
      };
    }

    // --- generate_sprite_sheet ---
    if (name === "generate_sprite_sheet") {
      return {
        content: [{ type: "text", text: generateSpriteSheet({
          project_path: parsedArgs.project_path as string,
          name: parsedArgs.name as string,
          workbench_url: parsedArgs.workbench_url as string | undefined,
          character_id: parsedArgs.character_id as string | undefined,
          export_size: parsedArgs.export_size as number | undefined,
        }) }],
      };
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  } catch (e: unknown) {
    return { content: [{ type: "text", text: cnError(e) }], isError: true };
  }
}

/**
 * Post-generation validation: check generated .tscn files for integrity.
 * Called automatically after generate_* tools produce output.
 */
function validateGeneratedOutput(projectPath: string, generatedPaths: string[]): string {
  if (!generatedPaths || generatedPaths.length === 0) return "";
  const results: string[] = ["", "── 自动输出校验 ──"];
  for (const p of generatedPaths) {
    try {
      const result = validateScene({ scene_path: p, project_path: projectPath });
      const failed = result.includes("[ERROR]");
      results.push(`  ${failed ? "❌" : "✅"} ${p.split("/").pop()}: ${failed ? "有错误" : "通过"}`);
      if (failed) {
        results.push(...result.split("\n").filter(l => l.startsWith("[")).map(l => `    ${l}`));
      }
    } catch {
      results.push(`  ⚠️  ${p}: 无法校验`);
    }
  }
  if (results.length === 2) return "";
  return results.join("\n");
}
