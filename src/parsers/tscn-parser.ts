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

    // Build node tree
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
      this.parseHeader(line);
    } else if (line.startsWith("[ext_resource")) {
      this.state = ParseState.EXT_RESOURCE;
      this.parseExtResource(line);
    } else if (line.startsWith("[sub_resource")) {
      this.state = ParseState.SUB_RESOURCE;
      this.parseSubResource(line);
    } else if (line.startsWith("[node")) {
      this.state = ParseState.NODE;
      this.parseNode(line);
    } else if (line.startsWith("[connection")) {
      this.state = ParseState.CONNECTION;
      this.parseConnection(line);
    } else {
      // Unknown block, ignore
      this.state = ParseState.ROOT;
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

  private parseLine(line: string): void {
    // Parse property lines based on current state
    // For now, just skip them
    // TODO: Implement property parsing in future versions
  }

  private buildNodeTree(): SceneNode | null {
    if (this.nodes.length === 0) {
      return null;
    }

    // Find root node(s)
    // In Godot .tscn format:
    // - no parent field = root node
    // - parent="." = root node
    const rootNodes = this.nodes.filter(n => n.parent === null || n.parent === ".");

    if (rootNodes.length === 0) {
      // No root node found, use first node
      return this.nodes[0];
    }

    // Use first root node
    const rootNode = rootNodes[0];

    // Resolve parent="." to root node name
    for (const node of this.nodes) {
      if (node.parent === ".") {
        node.parent = rootNode.name;
      }
    }

    // Build tree
    this.buildChildren(rootNode, this.nodes);

    return rootNode;
  }

  private buildChildren(parent: SceneNode, allNodes: SceneNode[]): void {
    const children = allNodes.filter(n => n.parent === parent.name);
    for (const child of children) {
      parent.children.push(child);
      this.buildChildren(child, allNodes);
    }
  }
}

// Export convenience function
export function parseTscnFile(filePath: string): ParsedScene {
  const parser = new TscnParser();
  return parser.parse(filePath);
}
