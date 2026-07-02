// Godot 3.x to 4.x node type mappings
import type { NodeTypeMapping, PropertyMapping } from "../types.js";

export const NODE_TYPE_MAPPINGS: NodeTypeMapping[] = [
  // Physics bodies
  { v4: "CharacterBody2D", v3: "KinematicBody2D", note: "Renamed in Godot 4" },
  { v4: "CharacterBody3D", v3: "KinematicBody", note: "Renamed in Godot 4" },
  { v4: "RigidBody2D", v3: "RigidBody2D", note: "Unchanged" },
  { v4: "RigidBody3D", v3: "RigidBody", note: "Renamed in Godot 4" },
  { v4: "StaticBody2D", v3: "StaticBody2D", note: "Unchanged" },
  { v4: "StaticBody3D", v3: "StaticBody", note: "Renamed in Godot 4" },
  { v4: "AnimatableBody2D", v3: null, note: "New in Godot 4" },

  // Areas
  { v4: "Area2D", v3: "Area2D", note: "Unchanged" },
  { v4: "Area3D", v3: "Area", note: "Renamed in Godot 4" },

  // 3D nodes
  { v4: "Node3D", v3: "Spatial", note: "Renamed in Godot 4" },

  // UI
  { v4: "Control", v3: "Control", note: "Unchanged" },

  // Particles
  { v4: "GPUParticles2D", v3: "Particles2D", note: "Renamed in Godot 4" },
  { v4: "GPUParticles3D", v3: "Particles", note: "Renamed in Godot 4" },
  { v4: "CpuParticles2D", v3: null, note: "New in Godot 4" },

  // Networking
  { v4: "MultiplayerSynchronizer", v3: null, note: "New in Godot 4" },
  { v4: "MultiplayerSpawner", v3: null, note: "New in Godot 4" },

  // Navigation
  { v4: "NavigationAgent2D", v3: "NavigationAgent2D", note: "Renamed from NavigationAgent in Godot 3.5+" },
  { v4: "NavigationRegion2D", v3: "NavigationRegion2D", note: "Unchanged" },
];

/** Build a v3 → v4 lookup map */
export const V3_TO_V4: Record<string, string> = {};
/** Build a v4 → v3 lookup map */
export const V4_TO_V3: Record<string, string> = {};

for (const m of NODE_TYPE_MAPPINGS) {
  if (m.v3) {
    V3_TO_V4[m.v3] = m.v4;
  }
  if (V4_TO_V3[m.v4] === undefined) {
    // Only set if not already mapped (keep first occurrence)
    V4_TO_V3[m.v4] = m.v3 || m.v4;
  }
}

/** Known property changes between Godot 3 and 4 */
export const PROPERTY_MAPPINGS: PropertyMapping[] = [
  // Transform properties
  { v4: "position", v3: "position", note: "Same in both" },
  { v4: "rotation", v3: "rotation", note: "Now in radians (was degrees in Godot 3.x)" },

  // Collision
  { v4: "disabled", v3: "disabled", note: "Same" },

  // Shaders
  { v4: "material", v3: "material", note: "Same" },
  { v4: "shader_material", v3: "shader_material", note: "Same" },
];
