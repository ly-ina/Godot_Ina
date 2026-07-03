// Consolidated game system generator. Call with type to generate specific systems.
// Colors and dimensions from shared theme config (src/config/game-theme.ts) for consistency.
import { generateComponent } from "./impl/generate_component.js";
import { generateTerrain } from "./impl/generate_terrain.js";
import { generateBehaviorTree } from "./impl/generate_behavior_tree.js";
import { generateEquipmentSystem } from "./impl/generate_equipment_system.js";
import { generateSceneTransition } from "./impl/generate_scene_transition.js";
import { generateSlgMap } from "./impl/generate_slg_map.js";
import { generateExampleProject } from "./impl/generate_example_project.js";
import { generateAnimation } from "./impl/generate_animation.js";
import { generateSprite } from "./impl/generate_sprite.js";
import { demoCharacter } from "./impl/demo_character.js";
import { generateMinecraftDemo } from "./impl/generate_minecraft_demo.js";
import { PluginRegistry } from "./plugin-registry.js";
import { PLAYER, NPC, WORLD, BLOCK_COLORS, SKY, GROUND } from "../config/game-theme.js";

export interface GenerateGameArgs {
  type: string;
  project_path: string;
  name?: string;
  description?: string;
  behavior?: string;
  sprite_path?: string;
  region?: string;
  template?: string;
  extra?: string;
}

/**
 * One tool to generate any game system. Supports built-in types and external plugins.
 * Plugin developers: use PluginRegistry.register(type, fn) to add custom generators.
 */
export function generateGame(args: GenerateGameArgs): string {
  const { type, project_path } = args;
  if (!project_path) throw new Error("project_path is required");

  // Built-in types
  switch (type) {
    case "component":
      return generateComponent({ type: (args.extra || "player") as any, output_path: project_path } as any);

    case "terrain":
      return generateTerrain({ project_path, template: (args.template || "default") as any, ...(args.extra ? JSON.parse(args.extra) : {}) } as any);

    case "behavior_tree":
      return generateBehaviorTree({ project_path, ...(args.extra ? JSON.parse(args.extra) : {}) } as any);

    case "equipment":
      return generateEquipmentSystem({ project_path, ...(args.extra ? JSON.parse(args.extra) : {}) } as any);

    case "scene_transition":
      return generateSceneTransition({ project_path, ...(args.extra ? JSON.parse(args.extra) : {}) } as any);

    case "slg_map":
      return generateSlgMap({ project_path, ...(args.extra ? JSON.parse(args.extra) : {}) } as any);

    case "example_project":
      return generateExampleProject({ output_path: project_path, template: (args.template || "platformer2d") as any, project_name: args.name } as any);

    case "character_animation":
      return generateAnimation({ project_path, name: args.name || "character", sprite_path: args.sprite_path, region: args.region } as any);

    case "character_demo":
      return demoCharacter({ project_path, name: args.name || "demo_char", sprite_path: args.sprite_path, region: args.region, behavior: (args.behavior as any) || "wander" } as any);

    case "sprite":
      return generateSprite({ output_path: project_path, name: args.name || "character", description: args.description } as any);

    case "minecraft_demo":
      return generateMinecraftDemo({ project_path });

    default: {
      // Check plugin registry
      const pluginResult = PluginRegistry.execute(type, args);
      if (pluginResult !== null) return pluginResult;
      throw new Error(`Unknown generate type: ${type}. Built-in: component, terrain, behavior_tree, equipment, scene_transition, slg_map, example_project, character_animation, character_demo, sprite, minecraft_demo. Add custom types via PluginRegistry.register().`);
    }
  }
}
