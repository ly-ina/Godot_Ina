// Write structured scene data back to .tscn file format (Godot 4.x)
import {
  TscnHeader,
  ExtResource,
  SubResource,
  SceneNode,
  Connection,
  ParsedScene,
} from "../parsers/tscn-types.js";
import * as fs from "fs";
import * as path from "path";

export interface WriteSceneOptions {
  /** Whether to generate a new uid (default: false, keep existing) */
  generateUid?: boolean;
  /** Whether to pretty-print (default: true) */
  pretty?: boolean;
}

/**
 * Convert ParsedScene back to .tscn format string
 */
export function sceneToTscn(
  scene: ParsedScene,
  options: WriteSceneOptions = {}
): string {
  const lines: string[] = [];

  // 1. Header
  lines.push(sceneToHeader(scene.header));

  // 2. Blank line
  lines.push("");

  // 3. Ext Resources
  for (const ext of scene.extResources) {
    lines.push(extResourceToBlock(ext));
  }

  if (scene.extResources.length > 0) {
    lines.push("");
  }

  // 4. Sub Resources
  for (const sub of scene.subResources) {
    lines.push(subResourceToBlock(sub));
    // Sub resource properties
    for (const [key, value] of Object.entries(sub.properties)) {
      lines.push(`${key} = ${valueToString(value)}`);
    }
    lines.push("");
  }

  // 5. Nodes
  if (scene.rootNode) {
    writeNode(lines, scene.rootNode, null);
  }

  // 6. Connections
  if (scene.connections.length > 0) {
    lines.push("");
    for (const conn of scene.connections) {
      lines.push(connectionToBlock(conn));
    }
  }

  return lines.join("\n") + "\n";
}

/**
 * Write a node and its children to lines
 */
function writeNode(
  lines: string[],
  node: SceneNode,
  parentPath: string | null
): void {
  // Build node declaration
  const parts: string[] = [];

  if (parentPath === null) {
    // Root node: [node name="..." type="..."]
    parts.push(`[node name="${node.name}" type="${node.type}"`);
  } else if (parentPath === ".") {
    // Direct child of root: [node name="..." type="..." parent="."]
    parts.push(`[node name="${node.name}" type="${node.type}" parent="."`);
  } else {
    // Child of another node: [node name="..." type="..." parent="..."]
    parts.push(`[node name="${node.name}" type="${node.type}" parent="${parentPath}"`);
  }

  // Close the bracket
  const nodeDecl = parts.join(" ") + "]";
  lines.push(nodeDecl);

  // Node properties
  for (const [key, value] of Object.entries(node.properties)) {
    lines.push(`${key} = ${valueToString(value)}`);
  }

  // Children
  for (const child of node.children) {
    const childPath =
      parentPath === null ? `.` : `${parentPath}/${node.name}`;
    writeNode(lines, child, childPath);
  }

  // Blank line between nodes (Godot convention)
  if (node.children.length > 0 || Object.keys(node.properties).length > 0) {
    lines.push("");
  }
}

/**
 * Convert header to [gd_scene ...] line
 */
function sceneToHeader(header: TscnHeader): string {
  const parts = [`[gd_scene load_steps=${header.loadSteps} format=${header.format}`];

  if (header.uid) {
    parts.push(`uid="${header.uid}"`);
  }

  return parts.join(" ") + "]";
}

/**
 * Convert ExtResource to [ext_resource ...] line
 */
function extResourceToBlock(ext: ExtResource): string {
  return `[ext_resource type="${ext.type}" path="${ext.path}" id="${ext.id}"]`;
}

/**
 * Convert SubResource to [sub_resource ...] line
 */
function subResourceToBlock(sub: SubResource): string {
  return `[sub_resource type="${sub.type}" id="${sub.id}"]`;
}

/**
 * Convert Connection to [connection ...] line
 */
function connectionToBlock(conn: Connection): string {
  const parts = [
    `[connection signal="${conn.signal}"`,
    `from="${conn.from}"`,
    `to="${conn.to}"`,
    `method="${conn.method}"`,
  ];

  if (conn.flags !== undefined) {
    parts.push(`flags=${conn.flags}`);
  }

  if (conn.args && conn.args.length > 0) {
    parts.push(`args=${JSON.stringify(conn.args)}`);
  }

  return parts.join(" ") + "]";
}

/**
 * Convert a value to Godot .tscn format string
 */
function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    // Check if it's an integer
    if (Number.isInteger(value)) {
      return value.toString();
    }
    // Float: preserve decimal point
    const str = value.toString();
    return str.includes(".") ? str : `${str}.0`;
  }

  if (typeof value === "string") {
    // Check if it's a resource reference
    if (value.startsWith("ExtResource(") || value.startsWith("SubResource(")) {
      return value;
    }
    // Check if it's a NodePath
    if (value.startsWith("NodePath(")) {
      return value;
    }
    // Regular string: already quoted in most cases
    return `"${value}"`;
  }

  if (Array.isArray(value)) {
    const items = value.map((v) => valueToString(v));
    return `[${items.join(", ")}]`;
  }

  if (typeof value === "object") {
    // Dictionary
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `"${k}": ${valueToString(v)}`
    );
    return `{${entries.join(", ")}}`;
  }

  // Fallback
  return String(value);
}

/**
 * Write scene to file
 */
export function writeSceneToFile(
  scene: ParsedScene,
  filePath: string,
  options?: WriteSceneOptions
): void {
  const content = sceneToTscn(scene, options);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Create a new empty scene
 */
export function createEmptyScene(
  rootNodeName: string,
  rootNodeType: string
): ParsedScene {
  return {
    header: {
      format: 3, // Godot 4.x
      loadSteps: 2,
      uid: `uid://${generateUid()}`,
    },
    extResources: [],
    subResources: [],
    rootNode: {
      name: rootNodeName,
      type: rootNodeType,
      parent: null,
      properties: {},
      children: [],
    },
    connections: [],
  };
}

/**
 * Generate a random uid
 */
function generateUid(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
