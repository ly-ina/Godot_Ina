import * as fs from "fs";
import {
  ParsedScene,
  TscnHeader,
  ExtResource,
  SubResource,
  SceneNode,
  Connection,
  ParseState,
  GODOT_4_FORMAT,
} from "./tscn-types.js";

export class TscnParser {
  private lines: string[] = [];
  private currentLine: number = 0;
  private state: ParseState = ParseState.ROOT;

  // Parsed data
  private header: TscnHeader = { format: 0, loadSteps: 0 };
  private extResources: ExtResource[] = [];
  private subResources: SubResource[] = [];
  private nodes: SceneNode[] = [];
  private connections: Connection[] = [];

  /** Index of the sub_resource or node currently being populated with properties */
  private currentBlockIndex: number = -1;

  /**
   * Parse a .tscn file and return structured data
   */
  public parse(filePath: string): ParsedScene {
    // Read file
    const content = fs.readFileSync(filePath, "utf-8");
    this.lines = content.split("\n");
    this.currentLine = 0;

    // Reset state
    this.state = ParseState.ROOT;
    this.header = { format: 0, loadSteps: 0 };
    this.extResources = [];
    this.subResources = [];
    this.nodes = [];
    this.connections = [];
    this.currentBlockIndex = -1;

    // Parse line by line
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith(";")) {
        this.currentLine++;
        continue;
      }

      // Check for block declarations
      if (line.startsWith("[")) {
        this.parseBlockDeclaration(line);
      } else {
        // Parse content based on current state
        this.parseLine(line);
      }

      this.currentLine++;
    }

    // Build node tree (does NOT mutate original nodes)
    const rootNode = this.buildNodeTree();

    return {
      header: this.header,
      extResources: this.extResources,
      subResources: this.subResources,
      rootNode,
      connections: this.connections,
    };
  }

  private parseBlockDeclaration(line: string): void {
    if (line.startsWith("[gd_scene")) {
      this.state = ParseState.ROOT;
      this.currentBlockIndex = -1;
      this.parseHeader(line);
    } else if (line.startsWith("[ext_resource")) {
      this.state = ParseState.EXT_RESOURCE;
      this.currentBlockIndex = -1;
      this.parseExtResource(line);
    } else if (line.startsWith("[sub_resource")) {
      this.state = ParseState.SUB_RESOURCE;
      this.currentBlockIndex = this.subResources.length;
      this.parseSubResource(line);
    } else if (line.startsWith("[node")) {
      this.state = ParseState.NODE;
      this.currentBlockIndex = this.nodes.length;
      this.parseNode(line);
    } else if (line.startsWith("[connection")) {
      this.state = ParseState.CONNECTION;
      this.currentBlockIndex = -1;
      this.parseConnection(line);
    } else {
      // Unknown block, ignore
      this.state = ParseState.ROOT;
      this.currentBlockIndex = -1;
    }
  }

  private parseHeader(line: string): void {
    const loadStepsMatch = line.match(/load_steps=(\d+)/);
    const formatMatch = line.match(/format=(\d+)/);
    const uidMatch = line.match(/uid="([^"]+)"/);

    if (loadStepsMatch) {
      this.header.loadSteps = parseInt(loadStepsMatch[1], 10);
    }
    if (formatMatch) {
      this.header.format = parseInt(formatMatch[1], 10);
    }
    if (uidMatch) {
      this.header.uid = uidMatch[1];
    }
  }

  private parseExtResource(line: string): void {
    const typeMatch = line.match(/type="([^"]+)"/);
    const pathMatch = line.match(/path="([^"]+)"/);
    const idMatch = line.match(/id="([^"]+)"/);

    if (typeMatch && pathMatch && idMatch) {
      this.extResources.push({
        type: typeMatch[1],
        path: pathMatch[1],
        id: idMatch[1],
      });
    }
  }

  private parseSubResource(line: string): void {
    const typeMatch = line.match(/type="([^"]+)"/);
    const idMatch = line.match(/id="([^"]+)"/);

    if (typeMatch && idMatch) {
      this.subResources.push({
        type: typeMatch[1],
        id: idMatch[1],
        properties: {},
      });
    }
  }

  private parseNode(line: string): void {
    // [node name="Player" type="CharacterBody2D" parent="."]
    const nameMatch = line.match(/name="([^"]*)"/);
    const typeMatch = line.match(/type="([^"]*)"/);
    const parentMatch = line.match(/parent="([^"]*)"/);

    // Handle parent
    // In Godot .tscn format:
    // - no parent field = root node
    // - parent="." = parent is root node
    // - parent="NodeName" = parent is named node
    let parent: string | null = null;
    if (parentMatch) {
      const parentValue = parentMatch[1];
      if (parentValue === ".") {
        // Will be resolved later in buildNodeTree
        parent = ".";
      } else {
        parent = parentValue;
      }
    }

    if (nameMatch && typeMatch) {
      this.nodes.push({
        name: nameMatch[1],
        type: typeMatch[1],
        parent,
        properties: {},
        children: [],
      });
    }
  }

  private parseConnection(line: string): void {
    const signalMatch = line.match(/signal="([^"]+)"/);
    const fromMatch = line.match(/from="([^"]+)"/);
    const toMatch = line.match(/to="([^"]+)"/);
    const methodMatch = line.match(/method="([^"]+)"/);
    const flagsMatch = line.match(/flags=(\d+)/);

    if (signalMatch && fromMatch && toMatch && methodMatch) {
      this.connections.push({
        signal: signalMatch[1],
        from: fromMatch[1],
        to: toMatch[1],
        method: methodMatch[1],
        flags: flagsMatch ? parseInt(flagsMatch[1], 10) : 0,
      });
    }
  }

  /**
   * Parse a property line (key = value) and store it in the current block
   */
  private parseLine(line: string): void {
    // Skip blank or comment lines
    if (!line || line.startsWith(";")) return;

    // Parse key = value
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return;

    const key = line.substring(0, eqIndex).trim();
    let value: string = line.substring(eqIndex + 1).trim();

    // Store in the appropriate current block
    if (this.state === ParseState.SUB_RESOURCE && this.currentBlockIndex >= 0) {
      const sub = this.subResources[this.currentBlockIndex];
      if (sub) {
        sub.properties[key] = parseGodotValue(value);
      }
    } else if (this.state === ParseState.NODE && this.currentBlockIndex >= 0) {
      const node = this.nodes[this.currentBlockIndex];
      if (node) {
        node.properties[key] = parseGodotValue(value);
      }
    }
  }

  /**
   * Build node tree without mutating the original nodes
   */
  private buildNodeTree(): SceneNode | null {
    if (this.nodes.length === 0) {
      return null;
    }

    // Find root node(s)
    const rootNodes = this.nodes.filter(
      (n) => n.parent === null || n.parent === "."
    );

    if (rootNodes.length === 0) {
      // No root node found, use first node
      return { ...this.nodes[0] };
    }

    const rootNode = rootNodes[0];

    // Build name → node lookup (O(1))
    const nodeByName = new Map<string, SceneNode>();
    for (const node of this.nodes) {
      nodeByName.set(node.name, node);
    }

    // Attach each non-root child to its parent.
    // Resolve parent="." to the root node name.
    for (const node of this.nodes) {
      if (node === rootNode) continue;

      // Resolve parent reference
      const parentName =
        node.parent === "." ? rootNode.name : node.parent;

      if (parentName) {
        const parent = nodeByName.get(parentName);
        if (parent) {
          parent.children.push(node);
        }
      }
    }

    return rootNode;
  }
}

// ─── Value type parser ──────────────────────────────────────────────

/**
 * Parse a Godot .tscn value string into a JS value.
 * Handles: strings, numbers, booleans, Vec2/3/4, Color, Rect2, arrays, dictionaries, null.
 */
export function parseGodotValue(raw: string): unknown {
  if (raw === "null" || raw === "") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;

  // Quoted string
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw.slice(1, -1);
  }

  // Array: [a, b, c]
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => parseGodotValue(s.trim()));
  }

  // Dictionary: { "k": v }
  if (raw.startsWith("{") && raw.endsWith("}")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return {};
    const obj: Record<string, unknown> = {};
    // Simple split on commas that aren't inside quotes or brackets
    const pairs = splitTopLevel(inner, ",");
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;
      const kRaw = pair.substring(0, colonIdx).trim();
      const vRaw = pair.substring(colonIdx + 1).trim();
      const key = parseGodotValue(kRaw) as string;
      const val = parseGodotValue(vRaw);
      obj[key] = val;
    }
    return obj;
  }

  // Godot built-in types: Vector2(x, y), Color(r, g, b, a), etc.
  if (/^[A-Z]\w+\(/.test(raw) && raw.endsWith(")")) {
    // Resource references
    if (raw.startsWith("ExtResource(") || raw.startsWith("SubResource(")) {
      return raw; // Keep as-is for resource references
    }
    // NodePath
    if (raw.startsWith("NodePath(")) {
      return raw; // Keep as-is
    }

    // Generic Godot type: store as raw string
    return raw;
  }

  // Number (integer or float)
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") {
    return num;
  }

  // Fallback: return as raw string
  return raw;
}

/**
 * Split a string by a separator, respecting brackets/braces/parens nesting.
 */
function splitTopLevel(str: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "[" || ch === "{" || ch === "(") depth++;
    else if (ch === "]" || ch === "}" || ch === ")") depth--;
    else if (ch === sep && depth === 0) {
      parts.push(str.substring(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.substring(start).trim());
  return parts;
}

// Export convenience function
export function parseTscnFile(filePath: string): ParsedScene {
  const parser = new TscnParser();
  return parser.parse(filePath);
}
