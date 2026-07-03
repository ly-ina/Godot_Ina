// Consolidated game system generator. Call with type to generate specific systems.
import { generateComponent } from "./generate_component.js";
import { generateTerrain } from "./generate_terrain.js";
import { generateBehaviorTree } from "./generate_behavior_tree.js";
import { generateEquipmentSystem } from "./generate_equipment_system.js";
import { generateSceneTransition } from "./generate_scene_transition.js";
import { generateSlgMap } from "./generate_slg_map.js";
import { generateExampleProject } from "./generate_example_project.js";
import { generateAnimation } from "./generate_animation.js";
import { generateSprite } from "./generate_sprite.js";
import { demoCharacter } from "./demo_character.js";
import { generateMinecraftDemo } from "./generate_minecraft_demo.js";

export interface GenerateGameArgs {
  /** Type of game system to generate */
  type: "component" | "terrain" | "behavior_tree" | "equipment" | "scene_transition" | "slg_map" 
      | "example_project" | "character_animation" | "character_demo" | "sprite" | "minecraft_demo";
  /** Path to Godot project root */
  project_path: string;
  /** Various optional parameters depending on type */
  name?: string;
  description?: string;
  behavior?: string;
  sprite_path?: string;
  region?: string;
  template?: string;
  /** Extra JSON parameters for complex generation */
  extra?: string;
}

/**
 * One tool to generate any game system. Covers all previous generate_* tools.
 * Pass `type` to select which system to generate.
 */
export function generateGame(args: GenerateGameArgs): string {
  const { type, project_path } = args;
  if (!project_path) throw new Error("project_path is required");

  switch (type) {
    case "component":
      return generateComponent({
        type: (args.extra || "player") as any,
        output_path: project_path,
      } as any);

    case "terrain":
      return generateTerrain({
        project_path,
        template: (args.template || "default") as any,
        ...(args.extra ? JSON.parse(args.extra) : {}),
      } as any);

    case "behavior_tree":
      return generateBehaviorTree({
        project_path,
        ...(args.extra ? JSON.parse(args.extra) : {}),
      } as any);

    case "equipment":
      return generateEquipmentSystem({
        project_path,
        ...(args.extra ? JSON.parse(args.extra) : {}),
      } as any);

    case "scene_transition":
      return generateSceneTransition({
        project_path,
        ...(args.extra ? JSON.parse(args.extra) : {}),
      } as any);

    case "slg_map":
      return generateSlgMap({
        project_path,
        ...(args.extra ? JSON.parse(args.extra) : {}),
      } as any);

    case "example_project":
      return generateExampleProject({
        output_path: project_path,
        template: (args.template || "platformer2d") as any,
        project_name: args.name,
      } as any);

    case "character_animation":
      return generateAnimation({
        project_path,
        name: args.name || "character",
        sprite_path: args.sprite_path,
        region: args.region,
      } as any);

    case "character_demo":
      return demoCharacter({
        project_path,
        name: args.name || "demo_char",
        sprite_path: args.sprite_path,
        region: args.region,
        behavior: (args.behavior as any) || "wander",
      } as any);

    case "sprite":
      return generateSprite({
        output_path: project_path,
        name: args.name || "character",
        description: args.description,
      } as any);

    case "minecraft_demo":
      return generateMinecraftDemo({ project_path });

    default:
      throw new Error(`Unknown generate type: ${type}`);
  }
}
