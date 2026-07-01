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
    // Examples:
    // [gd_scene load_steps=3 format=3 uid="uid://..."]
    // [ext_resource type="Script" path="res://main.gd" id="1"]
    // [sub_resource type="StandardMaterial3D" id="2"]
    // [node name="Player" type="CharacterBody2D" parent="."]
    // [connection signal="body_entered" from="." to="." method="_on_body_entered"]

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
    // [gd_scene load_steps=3 format=3 uid="uid://..."]
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
    // [ext_resource type="Script" path="res://main.gd" id="1"]
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
    // [sub_resource type="StandardMaterial3D" id="2"]
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
    const nameMatch = line.match(/name="([^"]+)"/);
    const typeMatch = line.match(/type="([^"]+)"/);
    let parentMatch = line.match(/parent="([^"]+)"/);
    
    // Handle parent="." (root node)
    let parent: string | null = null;
    if (parentMatch) {
      if (parentMatch[1] === ".") {
        parent = null; // Root node
      } else {
        parent = parentMatch[1];
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
    // [connection signal="body_entered" from="." to="." method="_on_body_entered" flags=0]
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

    // Find root node (parent is null or ".")
    const rootNode = this.nodes.find(n => n.parent === null || n.parent === ".");
    if (!rootNode) {
      return this.nodes[0]; // Fallback
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
