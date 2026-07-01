// Tree operations for .tscn node trees
import { SceneNode } from "../parsers/tscn-types.js";

/**
 * Find a node in the tree by name (depth-first search)
 */
export function findNodeInTree(
  root: SceneNode,
  name: string
): SceneNode | null {
  if (root.name === name) return root;
  for (const child of root.children) {
    const found = findNodeInTree(child, name);
    if (found) return found;
  }
  return null;
}

/**
 * Compute the full path of a node in the tree.
 * Root node returns null (no parent field).
 * Direct child of root returns ".".
 * Nested returns "Root/Child/Grandchild" (the path of the parent).
 */
export function getNodePath(
  root: SceneNode,
  targetName: string,
  prefix: string | null = null
): string | null {
  if (root.name === targetName) {
    // Root node has no parent
    return prefix;
  }
  for (const child of root.children) {
    const childPrefix = prefix === null ? `.` : `${prefix}/${root.name}`;
    const result = getNodePath(child, targetName, childPrefix);
    if (result !== null) return result;
  }
  return null; // Not found
}

/**
 * Count total nodes in the tree
 */
export function countNodes(node: SceneNode | null): number {
  if (!node) return 0;
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Return a flat list of all nodes with their tree info
 */
export function flattenNodes(
  node: SceneNode,
  parent: string | null = null
): Array<{ name: string; type: string; parent: string | null }> {
  const result: Array<{ name: string; type: string; parent: string | null }> = [];
  result.push({ name: node.name, type: node.type, parent });
  for (const child of node.children) {
    result.push(...flattenNodes(child, node.name));
  }
  return result;
}

/**
 * Validate node type is a known Godot built-in type
 */
export function isValidNodeType(type: string): boolean {
  const knownTypes: string[] = [
    "Node", "Node2D", "Node3D", "Node4D",
    "Sprite2D", "Sprite3D", "AnimatedSprite2D", "AnimatedSprite3D",
    "CharacterBody2D", "CharacterBody3D",
    "RigidBody2D", "RigidBody3D", "StaticBody2D", "StaticBody3D",
    "Camera2D", "Camera3D",
    "CollisionShape2D", "CollisionShape3D", "CollisionPolygon2D", "CollisionPolygon3D",
    "Area2D", "Area3D",
    "Control", "Button", "Label", "RichTextLabel", "TextureRect", "Panel",
    "ColorRect", "LineEdit", "TextEdit",
    "TileMap", "TileMapLayer",
    "AudioStreamPlayer2D", "AudioStreamPlayer3D",
    "GPUParticles2D", "GPUParticles3D",
    "Light2D", "DirectionalLight3D", "OmniLight3D", "SpotLight3D",
    "CanvasLayer", "ParallaxLayer", "ParallaxBackground",
    "Timer", "AnimationPlayer", "AnimationTree",
    "Marker2D", "Marker3D", "Path2D", "Path3D", "PathFollow2D", "PathFollow3D",
    "VisibleOnScreenNotifier2D", "VisibleOnScreenNotifier3D",
    "RemoteTransform2D", "RemoteTransform3D",
    "MultiplayerSynchronizer", "MultiplayerSpawner",
  ];
  return knownTypes.includes(type);
}
